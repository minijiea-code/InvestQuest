self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '투자 학습 알림'
  const options = {
    body: data.body || '오늘의 퀘스트가 기다리고 있어요!',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: { url: data.url || '/home' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clientList) {
        const path = event.notification.data.url || '/home'
        const absoluteUrl = self.location.origin + path
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(absoluteUrl)
            return client.focus()
          }
        }
        if (clients.openWindow) return clients.openWindow(absoluteUrl)
      })
  )
})
