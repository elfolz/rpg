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
		fetch('/models/skeleton.glb', {cache: 'force-cache'})
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
				this.originalDir = this.object.rotation.y
				this.attackDelay = 0.375
				this.progress['this.object'] = 100
				this.callback(this.object)
			})
		})
		.catch(error => {
			console.log(error)
		})
	}

}