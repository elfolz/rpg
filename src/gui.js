'use strict'

import classes from './classes/classes.js'

var wakeLockObj
var chosenClass = Object.keys(classes)[1]

function initGUI() {
	Object.keys(classes).forEach(el => {
		if (el == 'general') return
		const option = document.createElement('option')
		option.value = el
		option.innerHTML = el.substring(0,1).toUpperCase() + el.slice(1)
		document.querySelector('select').appendChild(option)
	})
	document.querySelector('select').oninput = e => {
		let animationName, animation, delay
		animationName = classes[chosenClass].stow
		if (animationName) {
			animation = window.game.player.object.animations[animationName]
			window.game.player.executeCrossFade(window.game.player.object, animation, 'once')
			delay = animation.getClip().duration * 1000
			document.querySelector('select').disabled = true
			document.querySelector('main button').disabled = true
			setTimeout(() => {
				document.querySelector('select').disabled = false
				document.querySelector('main button').disabled = false
			}, delay + 100)
		}
		playSe()
		chosenClass = e.target.value
		animationName = classes[chosenClass].take
		if (animationName) {
			setTimeout(() => {
				animation = window.game.player.object.animations[animationName]
				window.game.player.synchronizeCrossFade(window.game.player.object, animation, 'once')
				delay = animation.getClip().duration * 1000
				document.querySelector('select').disabled = true
				document.querySelector('main button').disabled = true
				setTimeout(() => {
					document.querySelector('select').disabled = false
					document.querySelector('main button').disabled = false
				}, delay + 100)
			}, 100)
			setTimeout(() => {playSe()}, 400)
		} else if (chosenClass == 'mago') {
			setTimeout(() => {playSe()}, 400)
		}
		setTimeout(() => {
			animationName = classes[chosenClass].idle
			animation = window.game.player.object.animations[animationName]
			if (window.game.player.object.lastAction.loop == 2200) window.game.player.synchronizeCrossFade(window.game.player.object, animation)
			else window.game.player.executeCrossFade(window.game.player.object, animation)
			delay = animation.getClip().duration * 1000
			document.querySelector('select').disabled = true
			document.querySelector('main button').disabled = true
			setTimeout(() => {
				document.querySelector('select').disabled = false
				document.querySelector('main button').disabled = false
			}, delay + 100)
		}, 200)
		localStorage.setItem('chosenClass', chosenClass)
	}
	function playSe() {
		let se = null
		if (chosenClass == 'guerreiro') se = 'sword'
		else if (chosenClass == 'paladino') se = 'great-sword'
		else if (chosenClass == 'mago') se = 'stick'
		else if (chosenClass == 'arqueiro') se = 'bow'
		if (se) playSE(ses[se])
	}
}

function lockScreen() {
	if (document.hidden) return
	if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(el => wakeLockObj = el)
}

window.setFullscreen = () => {
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
	if (document.hidden) {
		document.querySelectorAll('footer section button').forEach(el => {
			el.classList.remove('active')
		})
		if (wakeLockObj) wakeLockObj.release()
	} else {
		lockScreen()
	}
}

document.onreadystatechange = () => { if (document.readyState == 'complete') initGUI() }
window.oncontextmenu = e => { e.preventDefault(); return false }
window.onresize = () => { window.game?.refreshResolution(false, true) }

document.addEventListener('click', () => {
	window.setFullscreen()
	window.sound.init()
}, {once: true})

lockScreen()