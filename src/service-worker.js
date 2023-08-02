import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(new RegExp(/.*\.(otf|ttf|woff|woff2|jpg|png|webp|gif|glb|fbx)$/, 'gi'), new CacheFirst())

self.skipWaiting()