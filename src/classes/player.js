'use strict'

import { SRGBColorSpace, AnimationMixer, Mesh, BoxGeometry, MeshBasicMaterial, PointLight} from 'three'
import { Entity } from '../classes/entity.js'
import classes from './classes.js'

export class Player extends Entity {

	projectilesProperties = [
		{
			name: 'arrow',
			yPosition: 0.15,
			yRotation: Math.PI / 2 * -1,
			scale: 0.0075
		},
		{
			name: 'energyball',
			yPosition: 0.1,
			scale: 0.015,
			rotate: true,
			light: {
				color: 0xc800ff,
				intensity: 1,
				distance: 5
			}
		}
	]

	constructor(camera, scene, callback, onload) {
		super(callback, onload)
		this.loadingElements = 2
		this.camera = camera
		this.scene = scene
		this.hp = 100
		this.maxhp = 100
		this.class = Object.keys(classes)[1]
		this.projectiles = []
	}

	loadModel() {
		fetch('./models/character.glb', {cache: 'force-cache'})
		.then(response => response.arrayBuffer() )
		.then(response => {
			this.gltfLoader.parse(response, null, gltf => {
				this.object = gltf.scene
				this.object.traverse(el => {
					if (el.isMesh) el.castShadow = true
					if (el.name == 'Plane') el.visible = false
				})
				this.object.colorSpace = SRGBColorSpace
				this.object.position.y -= 0.5
				this.mixer = new AnimationMixer(this.object)
				this.animations = gltf.animations.reduce((p, c) => {
					p[c.name] = this.mixer.clipAction(c)
					return p
				}, {})
				this.lastAction = this.animations[classes['espada curta'].idle]
				this.lastAction.play()
				this.object.position.x += 2.75
				this.object.rotation.y = Math.PI / 2 * -1
				this.camera.position.z = this.object.position.z + (window.innerWidth > window.innerHeight ? 4 : 14)
				this.hitbox = new Mesh(new BoxGeometry(0.25, 2, 0.25), new MeshBasicMaterial({visible: false, color: 0x00ff00}))
				this.object.add(this.hitbox)
				this.hitbox.geometry.computeBoundingBox()
				this.originalX = this.object.position.x
				this.originalDirection = this.object.rotation.y
				this.attackDelay = 0.3
				this.progress['character'] = 100
				this.loadProjectiles()
				this.callback(this.object)
			})
		})
		.catch(error => {
			console.log(error)
		})
	}

	loadProjectiles() {
		this.projectilesProperties.forEach(el => {
			fetch(`./models/${el.name}.glb`, {cache: 'force-cache'})
			.then(response => response.arrayBuffer() )
			.then(response => {
				this.gltfLoader.parse(response, null, gltf => {
					const projectile = gltf.scene
					projectile.traverse(obj => {
						if (obj.isMesh) obj.castShadow = true
					})
					if (el.scale) projectile.scale.set(el.scale, el.scale, el.scale)
					if (el.yRotation) projectile.rotation.y = el.yRotation
					if (el.yPosition) projectile.position.y = el.yPosition
					if (el.rotate) projectile.rotate = true
					if (el.light) {
						projectile.originalIntensity = el.light.intensity ?? 1
						const light = new PointLight(el.light.color ?? 0xffffff, projectile.originalIntensity, el.light.distance ?? 1)
						projectile.add(light)
					}
					projectile.transparent = true
					this.projectiles[el.name] = projectile
					this.scene.add(projectile)
					this.updateProjectiles()
					this.progress[el] = 100
				})
			})
			.catch(error => {
				console.log(error)
			})
		})
	}

	attack() {
		if (this.isFiring || this.isWalking || this.isAttacking) return
		document.querySelector('select').disabled = true
		document.querySelector('main button').disabled = true
		let animation, delay
		if (this.class == 'arco' && !this.isFiring) {
			this.projectiles['arrow'].position.x = this.object.position.x
			animation = this.animations[classes[this.class].load]
			this.executeCrossFade(animation, 'once')
			animation = this.animations[classes[this.class].idleArmed]
			this.synchronizeCrossFade(animation, 'once')
			animation = this.animations[classes[this.class].attack1]
			this.synchronizeCrossFade(animation, 'once')
			delay = animation.getClip().duration * 1000
			setTimeout(() => {
				window.sound.playSEbyName('bow')
				this.projectiles['arrow'].transparent = false
				this.isFiring = 'arrow'
			}, delay * 0.75)
			animation = this.animations[classes[this.class].idle]
			this.synchronizeCrossFade(animation)
		} else if (this.class == 'cajado' && !this.isFiring) {
			this.projectiles['energyball'].position.x = this.object.position.x
			animation = this.animations[classes[this.class].attack1]
			this.executeCrossFade(animation, 'once')
			delay = animation.getClip().duration * 1000
			setTimeout(() => {
				window.sound.playSEbyName('energyball')
				this.projectiles['energyball'].transparent = false
				this.isFiring = 'energyball'
			}, delay * 0.25)
			animation = this.animations[classes[this.class].idle]
			this.synchronizeCrossFade(animation)
		} else {
			animation = this.animations[classes[this.class].run ?? classes.general.run]
			this.executeCrossFade(animation)
			this.isWalking = true
		}
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

	updateActions() {
		if (this.isWalking) this.updateMelleeAttack()
		if (this.isFiring) this.updateRanggeAttack()
	}

	updateMelleeAttack() {
		let animation, delay
		const reached = Math.max(this.object.position.x, window.game.enemy.object.position.x) - Math.min(this.object.position.x, window.game.enemy.object.position.x)
		if (this.isReturning) {
			if (this.object.position.x == this.originalX) {
				animation = this.animations[classes[this.class].idle ?? classes.general.idle]
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
				animation = this.animations[classes[this.class].attack1 ?? classes.general.attack1]
				delay = animation.getClip().duration * 1000
				this.executeCrossFade(animation, 'once')
				setTimeout(() => {
					window.sound.playSEbyName('sword')
					setTimeout(() => {
						window.sound.playSEbyName('zombieYell')
						window.game.enemy.implyDamage()
					}, window.sound.ses['sword'].duration * 500)
				}, delay * this.attackDelay)
				animation = this.animations[classes[this.class].run ?? classesgeneral.run]
				this.synchronizeCrossFade(animation, 'repeat', 0.25, () => {
					this.isReturning = true
				})
				this.isAttacking = true
			}
		} else {
			this.object.position.x > window.game.enemy.object.position.x ? this.object.position.x -= 0.1 : this.object.position.x += 0.1
		}
	}

	updateRanggeAttack() {
		const reached = Math.max(this.projectiles[this.isFiring].position.x, window.game.enemy.object.position.x) - Math.min(this.projectiles[this.isFiring].position.x, window.game.enemy.object.position.x)
		if (reached <= 0.5) {
			this.projectiles[this.isFiring].transparent = true
			window.sound.playSEbyName('zombieYell')
			window.game.enemy.implyDamage()
			this.isFiring = null
			setTimeout(() => {
				document.querySelector('select').disabled = false
				document.querySelector('main button').disabled = false
			}, 300)
		} else {
			this.projectiles[this.isFiring].position.x > window.game.enemy.object.position.x ? this.projectiles[this.isFiring].position.x -= 0.25 : this.projectiles[this.isFiring].position.x += 0.25
		}
	}

	updateProjectiles() {
		for (let i in this.projectiles) {
			if (this.projectiles[i].oldTransparent != this.projectiles[i].transparent) {
				this.projectiles[i].traverse(el => {
					if (el.isMesh || el.isSprite) {
						this.projectiles[i].transparent ? el.scale.set(0, 0, 0) : el.scale.set(1, 1, 1)
					} else if (el.type == 'PointLight') {
						el.intensity = this.projectiles[i].transparent ? 0 : this.projectiles[i].originalIntensity
					}
				})
				this.projectiles[i].oldTransparent = this.projectiles[i].transparent
				if (this.projectiles[i].rotate && !this.projectiles[i].transparent) {
					this.projectiles[i].rotation.x += Math.PI / 50
					this.projectiles[i].rotation.y += Math.PI / 50
					this.projectiles[i].rotation.z += Math.PI / 50
				}
			}
		}
	}
	
	update(clockDelta) {
		super.update(clockDelta)
		this.updateProjectiles()
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