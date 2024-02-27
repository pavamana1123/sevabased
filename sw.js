const CACHE_NAME = 'images-cache-v1'
const CDN_URL = 'https://cdn.iskconmysore.org'

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([])
        })
    )
})

self.addEventListener('activate', () => {
    clients.claim()
})

self.addEventListener('fetch', (event) => {
    if (event.request.method == "GET" && event.request.url.startsWith(CDN_URL)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                return cachedResponse || fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        const responseToCache = response.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache)
                        })
                        return response
                    } else {
                        return response
                    }
                })
            })
        )
    }
})


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'clearCache') {
        caches.open(CACHE_NAME).then(cache=>{
            cache.keys().then(keys=>{
                keys.forEach(key=>{
                    if(key.url.includes(event.data.key)){
                        cache.delete(key)
                    }
                })
            })
        })
    }
})

const refreshCache = async ()=>{
    caches.open(CACHE_NAME).then(cache=>{
        cache.keys().then(keys=>{
            keys.forEach(async key=>{
                await cache.delete(key)
                try {
                    const response = await fetch(key)
                    if (response.status === 200) {
                        cache.put(key, response.clone())
                    }
                }catch(e){
                    console.log(e)
                }
            })
        }).catch(e=>{
            console.log(`[CACHE REF] Could not get keys of cache ${CACHE_NAME}:`, e)
        })
    }).catch(e=>{
        console.log(`[CACHE REF] Could not get cache ${CACHE_NAME}:`, e)
    })
}

const refreshCron = ()=>{
  const now = new Date()
  const next12AM = new Date(now)
  next12AM.setHours(24, 0, 0, 0)
  setTimeout(async ()=>{
    await refreshCache()
    setInterval(refreshCache, 24*60*60*1000 )
  }, Math.floor(next12AM - now))
}

refreshCron()

