'use strict'

import { SRGBColorSpace, Mesh, BoxGeometry, MeshBasicMaterial, AnimationMixer} from 'three'
import { Entity } from './entity.js'

export class Skeleton extends Entity {

	constructor(callback, onload) {
		super(callback, onload)
		this.loadingElements = 1
		this.hp = 100
		this.maxhp = 100
	}

	loadModel() {
		fetch('./models/skeleton.glb', {cache: 'force-cache'})
		.then(response => response.arrayBuffer() )
		.then(response => {
			this.gltfLoader.parse(response, null, gltf => {
				this.object = gltf.scene
				this.object.traverse(el => {
					if (el.isMesh) el.castShadow = true
				})
				this.object.colorSpace = SRGBColorSpace
				this.object.position.y -= 0.5
				this.object.position.x -= 3
				this.object.rotation.y = Math.PI / 2
				this.object.scale.set(0.35, 0.35, 0.35)
				this.hitbox = new Mesh(new BoxGeometry(0.75, 5.25, 0.75), new MeshBasicMaterial({visible: false, color: 0x00ff00}))
				this.object.add(this.hitbox)
				this.hitbox.geometry.computeBoundingBox()
				this.mixer = new AnimationMixer(this.object)
				this.animations = gltf.animations.reduce((p, c) => {
					p[c.name] = this.mixer.clipAction(c)
					return p
				}, {})
				this.lastAction = this.animations['idle']
				this.lastAction.play()
				this.originalX = this.object.position.x
				this.originalDirection = this.object.rotation.y
				this.attackDelay = 0.35
				this.progress['this.object'] = 100
				this.callback(this.object)
			})
		})
		.catch(error => {
			console.log(error)
		})
	}

	attack() {
		document.querySelector('select').disabled = true
		document.querySelector('main button').disabled = true
		this.executeCrossFade(this.animations['run'], 'repeat')
		this.isWalking = true
	}

	updateActions() {
		if (this.isWalking) this.updateMelleeAttack()
	}

	updateMelleeAttack() {
		let animation, delay
		const reached = Math.max(this.object.position.x, window.game.player.object.position.x) - Math.min(this.object.position.x, window.game.player.object.position.x)
		if (this.isReturning) {
			if (this.object.position.x == this.originalX) {
				animation = this.animations['idle']
				delay = animation.getClip().duration * 1000
				this.executeCrossFade(animation)
				this.object.rotation.y = this.originalDirection
				this.isWalking = false
				this.isReturning = false
				this.isAttacking = false
				setTimeout(() => {
					document.querySelector('select').disabled = false
					document.querySelector('main button').disabled = false
				}, delay + 100)
			} else {
				if (this.object.rotation.y == this.originalDirection) this.object.rotation.y = this.originalDirection * -1
				this.object.position.x > this.originalX ? this.object.position.x -= 0.1 : this.object.position.x += 0.1
			}
		} else if (reached <= 1) {
			if (!this.isAttacking) {
				animation = this.animations['attack1']
				delay = animation.getClip().duration * 1000
				this.executeCrossFade(animation, 'once')
				setTimeout(() => {
					window.sound.playSEbyName('sword')
					setTimeout(() => {
						window.sound.playSEbyName('humanYell')
						window.game.player.implyDamage()
					}, window.sound.ses['sword'].duration * 500)
				}, delay * this.attackDelay)
				animation = this.animations['run']
				this.synchronizeCrossFade(animation, 'repeat', 0.25, () => {
					this.isReturning = true
				})
				this.isAttacking = true
			}
		} else {
			this.object.position.x > window.game.player.object.position.x ? this.object.position.x -= 0.1 : this.object.position.x += 0.1
		}
	}

	implyDamage() {
		let animation = this.animations['hit']
		this.executeCrossFade(animation, 'once')
		animation = this.animations['idle']
		this.synchronizeCrossFade(animation)
	}

}