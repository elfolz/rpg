'use strict'
import * as THREE from '../modules/three.module.js'
import { Entity } from '../classes/entity.js'
import classes from './classes.js'

export class Player extends Entity {

	constructor(camera, callback, onload) {
		super(callback, onload)
		this.loadingElements = 1
		this.camera = camera
		this.hp = 100
		this.maxhp = 100
		this.class = Object.keys(classes)[1]
	}

	loadModel() {
		fetch('/models/character.glb', {cache: 'force-cache'})
		.then(response => response.arrayBuffer() )
		.then(response => {
			this.gltfLoader.parse(response, null, gltf => {
				this.object = gltf.scene
				this.object.name = 'this.object'
				this.object.traverse(el => {
					if (el.isMesh) el.castShadow = true
					if (el.name == 'Plane') el.visible = false
				})
				this.object.colorSpace = THREE.SRGBColorSpace
				this.object.position.y -= 0.5
				this.mixer = new THREE.AnimationMixer(this.object)
				this.animations = gltf.animations.reduce((p, c) => {
					p[c.name] = this.mixer.clipAction(c)
					return p
				}, {})
				this.lastAction = this.animations[classes['espada curta'].idle]
				this.lastAction.play()
				this.object.position.x += 2.75
				this.object.rotation.y = Math.PI / 2 * -1
				this.camera.position.z = this.object.position.z + (window.innerWidth > window.innerHeight ? 4 : 14)
				this.object.hitbox = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2, 0.25), new THREE.MeshBasicMaterial({visible: false, color: 0x00ff00}))
				this.object.add(this.object.hitbox)
				this.object.hitbox.geometry.computeBoundingBox()
				this.object.originalX = this.object.position.x
				this.object.originalDir = this.object.rotation.y
				this.object.attackDelay = 0.35
				this.progress['character'] = 100
				this.callback(this.object)
			}, xhr => {
				if (xhr.total) this.progress['this.object'] = xhr.loaded / xhr.total * 99
			}, error => {
				console.error(error)
			})
		})
		.catch(error => {
			console.log(error)
		})
		/* fetch('./models/arrow.glb', {cache: 'force-cache'})
		.then(response => response.arrayBuffer() )
		.then(response => {
			gltfLoader.parse(response, null, gltf => {
				this.progress['arrow'] = 100
				arrow = gltf.scene
				arrow.traverse(el => {
					if (el.isMesh) el.castShadow = true
				})
				arrow.scale.set(0.0075, 0.0075, 0.0075)
				arrow.rotation.y = Math.PI / 2 * -1
				arrow.position.y += 0.15
				arrow.transparent = true
				updateProjectiles()
				scene.add(arrow)
			})
		})
		.catch(error => {
			console.log(error)
		})
		fetch('./models/energyball.glb', {cache: 'force-cache'})
		.then(response => response.arrayBuffer() )
		.then(response => {
			gltfLoader.parse(response, null, gltf => {
				this.progress['energyball'] = 100
				energyball = gltf.scene
				energyball.scale.set(0.015, 0.015, 0.015)
				energyball.position.y += 0.1
				energyball.transparent = true
				const light = new THREE.PointLight(0xc800ff, 10, 5)
				energyball.add(light)
				updateProjectiles()
				scene.add(energyball)
			})
		})
		.catch(error => {
			console.log(error)
		}) */
	}

	attack() {
		console.log(0)
	}

	changeWeapon(direction) {
		return new Promise(resolve => {
			const se = window.sound.ses[classes[this.class].se]
			if (se) window.sound.playSE(se)
			const animationName = classes[this.class][direction]
			if (!animationName) {
				if (se && direction == 'stow') return setTimeout(() => {resolve()}, se.duration * 1000)
				else return resolve()
			}
			const animation = this.animations[animationName]
			const delay = animation.getClip().duration * 1000
			this.executeCrossFade(animation, 'once')
			setTimeout(() => {resolve()}, delay)
		})
	}

	gameover() {
		/* document.querySelector('#game-over').classList.add('show')
		document.querySelector('header').style.setProperty('display', 'none')
		document.querySelectorAll('footer').forEach(el => el.style.setProperty('display', 'none'))
		window.game.gameover = true */
	}

	refreshHPBar() {
		/* let hpbarWidth = document.querySelector('#hpbar').clientWidth - 4
		let barWidth = Math.max(0, this.hp) * hpbarWidth / this.maxhp
		document.querySelector('#hpbar').style.setProperty('--hp-width', `${barWidth}px`)
		document.querySelector('#count-heal').innerHTML = this.potions */
	}

	resizeScene() {
		this.refreshHPBar()
	}

}