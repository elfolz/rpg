'use strict'
import * as THREE from '../modules/three.module.js'
import { GLTFLoader } from '../modules/gltfLoader.module.js'

export class Entity {

	constructor(callback, onload) {
		this.callback = callback
		this.onload = onload
		this.gltfLoader = new GLTFLoader()
		this.textureLoader = new THREE.TextureLoader()
		this.caster = new THREE.Raycaster()
		this.vertex = new THREE.Vector3()
		this.position = new THREE.Vector3()
		this.scale = new THREE.Vector3()
		this.roration = new THREE.Vector3()
		this.box1 = new THREE.Box3()
		this.box2 = new THREE.Box3()
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
	}

	executeCrossFade(newAction, duration=0.25, loop='repeat') {
		if (!this.lastAction || !newAction) return
		if (this.died && newAction.name != 'die') return
		if (this.lastAction == newAction) return newAction.reset()
		newAction.enabled = true
		newAction.setEffectiveTimeScale(1)
		newAction.setEffectiveWeight(1)
		newAction.loop = loop == 'pingpong' ? THREE.LoopPingPong : loop == 'once' ? THREE.LoopOnce : THREE.LoopRepeat
		newAction.clampWhenFinished = (loop == 'once')
		if (loop == 'once') newAction.reset()
		this.lastAction.crossFadeTo(newAction, duration, true)
		this.lastAction = newAction
		newAction.play()
	}

	synchronizeCrossFade(newAction, duration=0.25, loop='repeat') {
		this.mixer.addEventListener('finished', onLoopFinished)
		const vm = this
		function onLoopFinished(event) {
			vm.mixer.removeEventListener('finished', onLoopFinished)
			vm.executeCrossFade(newAction, duration, loop)
		}
	}

	updateObjectFollow(target, collided, speed) {
		if (!speed && this.movingSpeed) speed = this.movingSpeed
		else if (!speed) speed = 0.01
		const fpsSpeed = Math.min(60 * speed / window.game.fps, speed)
		const pos = target.object.position.clone()
		const dir = this.object.position.clone().sub(pos)
		const step = dir.multiplyScalar(collided ? fpsSpeed : fpsSpeed * -1)
		this.object.lookAt(pos)
		this.object.position.add(step)
	}
	
	async fetchAudio(key, url, positional=false, refDistance=10, maxDistance=100) {
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
		const sound = new THREE.PositionalAudio(window.sound?.audioListener)
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

	loadModel() {}

	initAudio() {}

	updateActions() {}

	resizeScene() {}

	toggleVisibility() {}

	setupDamage(damage) {}

}