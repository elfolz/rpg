'use strict'

import { TextureLoader, Raycaster, Vector3, Box3, LoopPingPong, LoopOnce, LoopRepeat, PositionalAudio } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class Entity {

	constructor(callback, onload) {
		this.callback = callback
		this.onload = onload
		this.gltfLoader = new GLTFLoader()
		this.textureLoader = new TextureLoader()
		this.caster = new Raycaster()
		this.vertex = new Vector3()
		this.position = new Vector3()
		this.scale = new Vector3()
		this.roration = new Vector3()
		this.box1 = new Box3()
		this.box2 = new Box3()
		this.progress = []
		this.animations = []
		this.audios = {}
		this.pendingSounds = []
		this.hitbox = {}
		this.setupLoading()
		this.loadModel()
	}

	setupLoading() {
		if (!this.onload) return
		const vm = this
		this.progress = new Proxy({}, {
			set: function(target, key, value) {
				target[key] = value
				let values = Object.values(target).slice()
				let total = values.reduce((a, b) => a + b, 0)
				total = total / (vm.loadingElements ?? 1)
				vm.onload(total)
				return true
			}
		})
	}

	update(clockDelta) {
		if (this.dead) return
		if (!window.game.pause) this.mixer?.update(clockDelta)
		this.updateActions()
	}

	executeCrossFade(newAction, loop='repeat', duration=0.25, callback) {
		return new Promise(resolve => {
			if (!this.lastAction || !newAction) return resolve()
			if (this.died && newAction.name != 'die') return resolve()
			if (this.lastAction == newAction) {
				newAction.reset()
				return resolve()
			}
			newAction.enabled = true
			newAction.setEffectiveTimeScale(1)
			newAction.setEffectiveWeight(1)
			newAction.loop = loop == 'pingpong' ? LoopPingPong : loop == 'once' ? LoopOnce : LoopRepeat
			newAction.clampWhenFinished = (loop == 'once')
			if (loop == 'once') newAction.reset()
			this.lastAction.crossFadeTo(newAction, duration, true)
			this.lastAction = newAction
			newAction.play()
			setTimeout(() => {
				if (callback) callback()
				resolve()
			}, newAction.getClip().duration * 1000)
		})
	}

	synchronizeCrossFade(newAction, loop='repeat', duration=0.25, callback) {
		return new Promise(resolve => {
			this.mixer.addEventListener('finished', onLoopFinished)
			const vm = this
			function onLoopFinished() {
				vm.mixer.removeEventListener('finished', onLoopFinished)
				vm.executeCrossFade(newAction, loop, duration)
				if (callback) callback()
				resolve()
			}
		})
	}
	
	async fetchAudio(key, url, positional=false, refDistance=1, maxDistance=10) {
		if (!window.sound?.audioContext) return
		try {
			let response = await fetch(url, {cache: 'force-cache'})
			let buffer = await response.arrayBuffer()
			let data = await window.sound.audioContext.decodeAudioData(buffer)
			this.audios[key] = data
			if (positional) this.setPositionalAudio(key, data, refDistance, maxDistance)
		} catch(error) {}
	}

	setPositionalAudio(name, data, refDistance=10, maxDistance=100) {
		if (!window.sound?.audioListener) return
		const sound = new PositionalAudio(window.sound.audioListener)
		sound.name = name
		sound.setBuffer(data)
		sound.setRefDistance(refDistance)
		sound.setMaxDistance(maxDistance)
		sound.onEnded = () => {
			sound.stop()
			this.se = undefined
		}
		if (this.object) this.object.add(sound)
		else this.pendingSounds.push(sound)
	}

	implyDamage() {
		let animation = this.animations['hit']
		this.executeCrossFade(animation, 'once')
		animation = this.animations['idle']
		this.synchronizeCrossFade(animation)
	}

	loadModel() {}

	initAudio() {}

	updateActions() {}

	resizeScene() {}

	toggleVisibility() {}

	setupDamage(damage) {}

}