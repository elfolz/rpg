'use strict'

import classes from './classes/classes.js'

var wakeLockObj

function initGUI() {
	Object.keys(classes).forEach(el => {
		if (el == 'general') return
		const option = document.createElement('option')
		option.value = el
		option.innerHTML = el.substring(0,1).toUpperCase() + el.slice(1)
		document.querySelector('select').appendChild(option)
	})
	document.querySelector('select').oninput = async e => {
		document.querySelector('select').disabled = true
		document.querySelector('main button').disabled = true
		await window.game.player.changeWeapon('stow')
		window.game.player.class = e.target.value
		await window.game.player.changeWeapon('take')
		let animationName = classes[window.game.player.class].idle
		let animation = window.game.player.animations[animationName]
		await window.game.player.executeCrossFade(animation)
		document.querySelector('select').disabled = false
		document.querySelector('main button').disabled = false
	}
	document.querySelector('main button').onclick = () => window.game.player.attack()
}

function toggleLockScreen() {
	if (document.hidden) return wakeLockObj?.release()
	if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(el => wakeLockObj = el)
}

function setFullscreen() {
	if (navigator.standalone) return
	if (document.fullscreenElement) return
	if (['127.0.0.1', 'localhost'].includes(location.hostname)) return
	if (!'requestFullscreen' in document.documentElement) return
	document.documentElement.requestFullscreen({navigationUI: 'hide'})
	.then(() => {
		return screen.orientation.lock('landscape')
	})
	.catch(e => {})
}

document.onvisibilitychange = () => {
	window.game?.toggleVisibility()
	window.sound?.toggleVisibility()
	toggleLockScreen()
}
document.onreadystatechange = () => {
	if (document.readyState == 'complete') initGUI()
}
document.addEventListener('click', () => {
	setFullscreen()
	window.sound.init()
}, {once: true})

window.oncontextmenu = e => { e.preventDefault(); return false }
window.onresize = () => { window.game?.resizeScene() }

toggleLockScreen()