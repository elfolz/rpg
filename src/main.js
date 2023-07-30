'use strict'

import './stylesheet.scss'
import './gui.js'

import { Sound } from './classes/sound.js'
import { Game } from './classes/game.js'

window.sound = new Sound()
window.game = new Game()

window.debugging = location.search.includes('debug')

if (location.protocol.startsWith('https')) {
	var swUpdating = false
	navigator.serviceWorker.register('service-worker.js')
	.then(reg => {
		reg.onupdatefound = () => {
			console.info('SW update found.')
			swUpdating = true
		}
		if (reg.installing) {
			console.info('SW installing...')
		} else if (reg.active && swUpdating) {
			console.info('SW updated. Reloading...')
			location.reload()
		}
	})
}