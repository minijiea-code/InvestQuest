import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// VAPID JWT (ES256)
async function generateVapidHeaders(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string,
): Promise<Record<string, string>> {
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const now = Math.floor(Date.now() / 1000)
  const payload = btoa(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const data = new TextEncoder().encode(`${header}.${payload}`)
  const keyData = Uint8Array.from(atob(privateKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return {
    Authorization: `vapid t=${header}.${payload}.${sigB64},k=${publicKey}`,
    TTL: '86400',
  }
}

// RFC 8291 (Web Push Message Encryption) + RFC 8188 (aes128gcm content coding)
async function encryptPayload(
  plaintext: string,
  p256dh: string,
  auth: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const b64u = (s: string) =>
    Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

  const clientPub = b64u(p256dh)
  const authSecret = b64u(auth)

  // Ephemeral server ECDH key pair
  const serverKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'],
  )
  const serverPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', serverKP.publicKey))

  // ECDH shared secret
  const clientPubKey = await crypto.subtle.importKey(
    'raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )
  const ecdhBits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPubKey }, serverKP.privateKey, 256),
  )

  // IKM = HKDF(IKM=ecdhBits, salt=authSecret, info="WebPush: info\0"||clientPub||serverPub, L=32)
  const ecdhKey = await crypto.subtle.importKey('raw', ecdhBits, 'HKDF', false, ['deriveBits'])
  const info1 = new Uint8Array([...enc.encode('WebPush: info\0'), ...clientPub, ...serverPubRaw])
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: info1 }, ecdhKey, 256),
  )

  // Random 16-byte encryption salt
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // CEK = HKDF(IKM=ikm, salt=salt, info="Content-Encoding: aes128gcm\0", L=16)
  const ikmKey1 = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: aes128gcm\0') },
      ikmKey1, 128,
    ),
  )

  // NONCE = HKDF(IKM=ikm, salt=salt, info="Content-Encoding: nonce\0", L=12)
  const ikmKey2 = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt, info: enc.encode('Content-Encoding: nonce\0') },
      ikmKey2, 96,
    ),
  )

  // AES-128-GCM encrypt: plaintext + 0x02 delimiter (RFC 8188 single-record)
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const padded = new Uint8Array([...enc.encode(plaintext), 0x02])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded),
  )

  // RFC 8188 header: salt(16) + rs(4, BE) + keyIdLen(1) + keyId(serverPubRaw)
  const header = new Uint8Array(21 + serverPubRaw.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096, false)
  header[20] = serverPubRaw.length
  header.set(serverPubRaw, 21)

  const result = new Uint8Array(header.length + ciphertext.length)
  result.set(header, 0)
  result.set(ciphertext, header.length)
  return result
}

async function sendOne(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  vapidPublic: string,
  vapidPrivate: string,
  vapidSubject: string,
): Promise<boolean> {
  try {
    const url = new URL(sub.endpoint)
    const audience = `${url.protocol}//${url.host}`
    const vapidHeaders = await generateVapidHeaders(audience, vapidSubject, vapidPublic, vapidPrivate)

    const encrypted = await encryptPayload(payload, sub.keys.p256dh, sub.keys.auth)

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        ...vapidHeaders,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
      },
      body: encrypted,
    })
    return res.ok || res.status === 201
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@investquest.app'

    if (!vapidPublic || !vapidPrivate) {
      return respond({ error: 'VAPID keys not set' }, 500)
    }

    const db = createClient(supabaseUrl, supabaseKey)
    const body = await req.json().catch(() => ({}))
    const type: 'morning' | 'evening' = body.type ?? 'morning'
    const today = new Date().toISOString().slice(0, 10)

    let query = db.from('push_subscriptions').select('user_id, subscription')

    // 저녁 알림: 오늘 퀘스트 미완료 사용자만
    if (type === 'evening') {
      const { data: completed } = await db
        .from('profiles')
        .select('id')
        .eq('last_quest_date', today)
      const completedIds = (completed ?? []).map((r: { id: string }) => r.id)
      if (completedIds.length > 0) {
        query = query.not('user_id', 'in', `(${completedIds.join(',')})`)
      }
    }

    const { data: subs, error } = await query
    if (error) return respond({ error: error.message }, 500)
    if (!subs || subs.length === 0) return respond({ sent: 0 })

    let notification: { title: string; body: string; url: string }

    if (type === 'morning') {
      const { data: marketData } = await db
        .from('market_summaries')
        .select('summary')
        .eq('date', today)
        .single()
      notification = {
        title: '오늘의 시장 요약 📈',
        body: marketData?.summary ?? '오늘 시장 소식을 확인해보세요.',
        url: '/explore',
      }
    } else {
      notification = {
        title: '스트릭이 끊기기 전에! 🔥',
        body: '오늘 퀘스트를 아직 안 했어요. 지금 5분으로 연속 학습을 이어가세요.',
        url: '/home',
      }
    }

    const payload = JSON.stringify(notification)
    let sent = 0

    for (const row of subs) {
      const sub = row.subscription as { endpoint: string; keys: { p256dh: string; auth: string } }
      const ok = await sendOne(sub, payload, vapidPublic, vapidPrivate, vapidSubject)
      if (ok) sent++
    }

    return respond({ sent, total: subs.length })
  } catch (err) {
    return respond({ error: String(err) }, 500)
  }
})
