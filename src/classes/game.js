'use strict'
import * as THREE from '../modules/three.module.js'
import { Skeleton } from '../classes/skeleton.js'
import { Player } from '../classes/player.js'
import { OrbitControls } from '../modules/orbitControls.js'
import texturesLoader from '../classes/texturesLoader.js'

export class Game {

	loadingElements = 3

	constructor() {
		this.lastFrameTime = performance.now()
		this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000)
		this.clock = new THREE.Clock()
		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
		this.dirLight = new THREE.DirectionalLight(0xffffff, 0.1)
		this.textureLoader = new THREE.TextureLoader()
		this.scene = new THREE.Scene()
		this.fps = 0
		this.fpsLimit = 1/60
		this.frames = 0
		this.clockDelta = 0
		this.initRender()
		this.setupLoading()
		document.body.appendChild(this.renderer.domElement)
	}

	initRender() {
		this.renderer = new THREE.WebGLRenderer({alpha: true})
		this.renderer.outputColorSpace = THREE.SRGBColorSpace
		this.renderer.shadowMap.enabled = true
		/* this.controls = new OrbitControls(this.camera, this.renderer.domElement)
		this.controls.enableRotate = true
		this.controls.enableZoom = false */
		/* this.controls.maxPolarAngle = (Math.PI / 2) - 0.1 */
		this.dirLight.position.set(0, 100, 100)
		this.dirLight.castShadow = true
		this.scene.add(this.ambientLight)
		this.scene.add(this.dirLight)
		this.scene.background = null
	}

	setupLoading() {
		const vm = this
		this.progress = new Proxy({}, {
			set: function(target, key, value) {
				target[key] = value
				let values = Object.values(target).slice()
				let progressbar = document.querySelector('progress')
				let total = values.reduce((a, b) => a + b, 0)
				total = total / vm.loadingElements
				if (progressbar) progressbar.value = parseInt(total || 0)
				if (total >= 100) vm.initGame()
				return true
			}
		})
		this.loadModels()
	}

	loadModels() {
		texturesLoader({
			attributes: {
				repeat: 10,
				normalScale: 1.5,
				aoMapIntensity: 5,
				displacementScale: 0.25,
				displacementBias: -0.01,
			},
			textures: [
				{type: 'aoMap', texture: 'Gravel021_1K_AmbientOcclusion.webp'},
				{type: 'displacementMap', texture: 'Gravel021_1K_Displacement.webp'},
				{type: 'map', texture: 'Gravel021_1K_Color.webp'},
				{type: 'normalMap', texture: 'Gravel021_1K_NormalDX.webp'}
			]
		})
		.then(response => {
			const ground = new THREE.Mesh(new THREE.PlaneGeometry(50, 50, 50, 50), response)
			ground.rotation.x = - Math.PI / 2
			ground.position.y -= 0.5
			ground.receiveShadow = true
			this.scene.add(ground)
			this.progress['ground'] = 100
		})
		this.player = new Player(this.camera,
			e => {
				this.scene.add(e)
			},
			e => {
				this.progress['player'] = e
			}
		)
		this.enemy = new Skeleton(
			e => {
				this.scene.add(e)
			},
			e => {
				this.progress['enemy'] = e
			}
		)
	}

	initGame() {
		if (this.initiated) return
		this.resizeScene()
		this.update()
		setTimeout(() => {
			document.body.classList.add('loaded')
			document.body.removeChild(document.querySelector('figure'))
			document.querySelector('main').style.removeProperty('display')
			document.querySelector('#fps').style.removeProperty('display')
			document.querySelector('main button').onclick = () => attack()
		}, 250)
		this.initiated = true
	}

	update() {
		requestAnimationFrame(() => this.update())
		if (document.hidden) return
		if (this.gameover) return
		this.clockDelta += this.clock.getDelta()
		if (this.fpsLimit && this.clockDelta < this.fpsLimit) return
		this.renderer.render(this.scene, this.camera)
		this.player.update(this.clockDelta)
		/* this.controls.update() */
		if (!this.paused) {
			this.updateFPSCounter()
			this.enemy.update(this.clockDelta)
		}
		this.clockDelta = this.fpsLimit ? this.clockDelta % this.fpsLimit : this.clockDelta % (1 / Math.max(this.fps, 30))
	}

	updateFPSCounter() {
		this.frames++
		if (performance.now() < this.lastFrameTime + 1000) return
		this.fps = Math.round(( this.frames * 1000 ) / ( performance.now() - this.lastFrameTime ))
		if (!Number.isNaN(this.fps)) {
			let ctx = document.querySelector('#fps').getContext('2d')
			ctx.font = 'bold 20px sans-serif'
			ctx.textAlign = 'end'
			ctx.textBaseline = 'middle'
			ctx.fillStyle = 'rgba(255,255,255,0.25)'
			ctx.clearRect(0, 0, 80, 20)
			ctx.fillText(`${this.fps} FPS`, 80, 10)
		}
		this.lastFrameTime = performance.now()
		this.frames = 0
	}

	resizeScene() {
		this.camera.aspect = window.innerWidth / window.innerHeight
		this.camera.position.z = this.player.object.position.z + (window.innerWidth > window.innerHeight ? 4 : 14)
		this.camera.updateProjectionMatrix()
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.player.resizeScene()
		this.enemy.resizeScene()
	}

	toggleVisibility() {
		this.player?.toggleVisibility()
		this.enemy?.toggleVisibility()
	}

	togglePause() {
		this.paused = !this.paused
		if (this.paused) document.querySelector('#glass').classList.add('opened')
		else document.querySelector('#glass').classList.remove('opened')
	}

	get delay() {
		return this.fpsLimit ? this.fpsLimit * 100 : 1
	}

}