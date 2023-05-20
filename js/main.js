import * as THREE from './three.module.js'
import { GLTFLoader } from './gltfLoader.module.js'
import { OrbitControls } from './orbitControls.js'

if (location.protocol.startsWith('https')) {
	navigator.serviceWorker.register('service-worker.js')
	navigator.serviceWorker.onmessage = m => {
		console.info('Update found!')
		if (m?.data == 'update') location.reload(true)
	}
}

const clock = new THREE.Clock()
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true})
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x000000, 0.5)
const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.5)
const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()
const scene = new THREE.Scene()
const controls = new OrbitControls(camera, renderer.domElement)
const fpsLimit = 1 / 60
const classes = {
	general: {
		idle: 'idle',
		walk: 'walk',
		run: 'move_RUN',
		hit: 'hit',
		pull: 'pull',
		push: 'push',
		jump_start: 'jump_start',
		jump_end: 'reception',
		death: 'move_DEATH',
		fall: 'fall'
	},
	guerreiro: {
		idle: 'idle(shield)',
		walk: 'walk(shield)',
		run: 'small_sword_shield_RUN',
		attack1: 'attack1(shield)',
		attack2: 'attack2(shield)',
		hit: 'hit(shield)',
		take: 'take(WeaponOneHand)',
		stow: 'stow(WeaponOneHand)',
		death: 'death(shield)',
		jump_start: 'jump_start(shield)',
		jump_end: 'reception(shield)',
		fall: 'fall(shield)'
	},
	paladino: {
		idle: 'idle(WeaponTwoHand)',
		walk: 'walk(WeaponTwoHand)',
		run: 'small_sword_RUN',
		attack1: 'attack1(WeaponTwoHand)',
		attack2: 'attack2(WeaponTwoHand)',
		hit: 'hit(WeaponTwoHand)',
		take: 'take(WeaponTwoHand)',
		stow: 'stow(WeaponTwoHand)',
		death: 'death(WeaponTwoHand)',
		jump_start: 'jump_start(WeaponTwoHand)',
		jump_end: 'reception(WeaponTwoHand)',
		fall: 'fall(WeaponTwoHand)'
	},
	mago: {
		idle: 'idle(stick)',
		walk: 'walk(stick)',
		run: 'stick_RUN',
		attack1: 'attack1(stick)'
	},
	arqueiro: {
		idle: 'bow_IDLE_ARMED',
		walk: 'walk(bow)',
		run: 'bow_RUN',
		attack1: 'bow_FIRE',
		hit: 'bow_HIT',
		load: 'bow_LOAD',
		take: 'take(bow)',
		stow: 'bow_STOW',
		death: 'bow_DEATH',
		jump_start: 'jump_start(bow)',
		jump_end: 'reception(bow)',
		fall: 'fall(bow)'
	}
}

const progress = new Proxy({}, {
	set: function(target, key, value) {
		target[key] = value
		let values = Object.values(target).slice()
		let progressbar = document.querySelector('progress')
		let total = values.reduce((a, b) => a + b, 0)
		total = total / 2
		if (progressbar) progressbar.value = parseInt(total || 0)
		if (total >= 100) setTimeout(() => initGame(), 1000)
		return true
	}
})

scene.background = null
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.sortObjects = false
renderer.setClearColor(0x000000, 0)
controls.enableRotate = true
controls.enableZoom = false
controls.maxPolarAngle = (Math.PI / 2) - 0.1
dirLight.position.set(0, 1, 0)
dirLight.castShadow = true
scene.add(dirLight)
scene.add(hemisphereLight)

var audio
var audioContext
var bgmGain
var seGain
var clockDelta = 0
var gameStarted = false
var userInteracted = false
var character
var object
var animations = []
var mixer
var lastAction
var chosenClass
var bgmBuffer
var bgmSource
var ses = []

function loadModels() {
	textureLoader.load('./textures/grass.webp', texture => {
			texture.wrapS = THREE.RepeatWrapping
			texture.wrapT = THREE.RepeatWrapping
			texture.colorSpace = THREE.SRGBColorSpace
			texture.repeat.set(parseInt(texture.wrapS / 1000), parseInt(texture.wrapT / 1000))
			const ground = new THREE.Mesh(new THREE.CircleGeometry(10, 320), new THREE.MeshLambertMaterial({map: texture, side: THREE.DoubleSide}))
			ground.rotation.x = - Math.PI / 2
			ground.receiveShadow = true
			scene.add(ground)
			if (!progress['ground']) progress['ground'] = 100
		}, xhr => {
			progress['ground'] = xhr.loaded / (xhr.total || 1) * 100
		}, error => {
			console.error(error)
		})
	gltfLoader.load('./models/character.glb',
		gltf => {
			character = gltf.scene
			animations = gltf.animations
			character.traverse(el => {
				if (el.isMesh) el.castShadow = true
				if (el.name == 'Object_11') object = el
				if (el.name == 'Plane') el.visible = false
			})
			character.colorSpace = THREE.SRGBColorSpace
			mixer = new THREE.AnimationMixer(character)
			lastAction = mixer.clipAction(animations.find(el => el.name == classes[Object.keys(classes)[1]].idle))
			lastAction.play()
			const box = new THREE.Box3().setFromObject(character)
			const size = box.getSize(new THREE.Vector3()).length()
			const center = box.getCenter(new THREE.Vector3())
			object.position.x += (object.position.x - center.x)
			object.position.y += (object.position.y - center.y)
			object.position.z += (object.position.z - center.z)
			dirLight.target = character
			camera.near = size / 100
			camera.far = size * 100
			camera.position.copy(center)
			camera.position.z += size * 0.65
			camera.lookAt(center)
			scene.add(character)
			initGame()
		}, xhr => {
			progress['character'] = xhr.loaded / (xhr.total || 1) * 100
		}, error => {
			console.error(error)
		}
	)
}

function initGame() {
	if (gameStarted) return
	gameStarted = true
	document.body.classList.add('loaded')
	document.body.removeChild(document.querySelector('figure'))
	document.querySelector('main').style.removeProperty('display')
	resizeScene()
	animate()
}

function resizeScene() {
	camera.aspect = window.visualViewport.width / window.visualViewport.height
	camera.updateProjectionMatrix()
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.visualViewport.width, window.visualViewport.height)
}

function animate() {
	requestAnimationFrame(animate)
	if (document.hidden) return
	clockDelta += clock.getDelta()
	if (fpsLimit && clockDelta < fpsLimit) return
	mixer.update(clockDelta)
	renderer.render(scene, camera)
	controls.update()
	clockDelta = fpsLimit ? clockDelta % fpsLimit : clockDelta
}

function executeCrossFade(newAction, loop='repeat') {
	if (lastAction == newAction) return newAction.reset()
	newAction.enabled = true
	newAction.setEffectiveTimeScale(1)
	newAction.setEffectiveWeight(1)
	newAction.loop = loop == 'pingpong' ? THREE.LoopPingPong : loop == 'once' ? THREE.LoopOnce : THREE.LoopRepeat
	newAction.clampWhenFinished = loop == 'once'
	if (loop == 'once') newAction.reset()
	lastAction.crossFadeTo(newAction, 0.25, true)
	lastAction = newAction
	newAction.play()
}

function synchronizeCrossFade(newAction, loop='repeat') {
	mixer.addEventListener('finished', onLoopFinished)
	function onLoopFinished() {
		mixer.removeEventListener('finished', onLoopFinished)
		executeCrossFade(newAction, loop)
	}
}

function classSelection() {
	Object.keys(classes).forEach(el => {
		if (el == 'general') return
		const option = document.createElement('option')
		option.value = el
		option.innerHTML = el.substring(0,1).toUpperCase() + el.slice(1)
		document.querySelector('select').appendChild(option)
	})
	document.querySelector('select').oninput = e => {
		let animationName
		let animation
		let clip
		let firstTime = chosenClass ? false : true
		if (!firstTime) {
			animationName = classes[chosenClass].stow
			if (animationName) {
				animation = animations.find(el => el.name == animationName)
				clip = mixer.clipAction(animation)
				executeCrossFade(clip, 'once')
			}
			let se = null
			if (chosenClass == 'guerreiro') se = 'sword'
			else if (chosenClass == 'paladino') se = 'great-sword'
			else if (chosenClass == 'mago') se = 'stick'
			else if (chosenClass == 'arqueiro') se = 'bow'
			if (se) playSE(ses[se])
		}
		chosenClass = e.target.value
		animationName = classes[chosenClass].take
		if (animationName) {
			setTimeout(() => {
				animation = animations.find(el => el.name == animationName)
				clip = mixer.clipAction(animation)
				if (firstTime) executeCrossFade(clip, 'once')
				else synchronizeCrossFade(clip, 'once')
			}, 100)
			playSe()
		} else if (chosenClass == 'mago') {
			playSe()
		}
		setTimeout(() => {
			animationName = classes[chosenClass].idle
			animation = animations.find(el => el.name == animationName)
			clip = mixer.clipAction(animation)
			if (lastAction.loop == THREE.LoopOnce) synchronizeCrossFade(clip)
			else executeCrossFade(clip)
		}, 200)
	}
	function playSe() {
		setTimeout(() => {
			let se = null
			if (chosenClass == 'guerreiro') se = 'sword'
			else if (chosenClass == 'paladino') se = 'great-sword'
			else if (chosenClass == 'mago') se = 'stick'
			else if (chosenClass == 'arqueiro') se = 'bow'
			if (se) playSE(ses[se])
		}, 400)
	}
}

function initAudio() {
	audio = new Audio()
	audioContext = new AudioContext()
	bgmGain = audioContext.createGain()
	bgmGain.gain.value = 0.25
	seGain = audioContext.createGain()
	seGain.gain.value = 1
	const destination = audioContext.createMediaStreamDestination()
	bgmGain.connect(audioContext.destination)
	seGain.connect(audioContext.destination)
	audio.srcObject = destination.stream
	audio.play()
	fetch('./audio/bgm/bgm.mp3')
	.then(response => {
		response.arrayBuffer()
		.then(buffer => {
			audioContext.decodeAudioData(buffer)
			.then(audioData => {
				bgmBuffer = audioData
				playBGM()
			})
		})
	})
	const seList = ['bow', 'great-sword', 'stick', 'sword']
	seList.forEach(el => {
		fetch(`./audio/se/${el}.mp3`)
		.then(response => {
			response.arrayBuffer()
			.then(buffer => {
				audioContext.decodeAudioData(buffer)
				.then(audioData => {
					ses[el] = audioData
				})
			})
		})
	})
}

function playBGM(restart=true) {
	if (!audioContext || !bgmBuffer) return
	bgmSource = audioContext.createBufferSource()
	bgmSource.buffer = bgmBuffer
	bgmSource.loop = true
	bgmSource.connect(bgmGain)
	if (localStorage.getItem('bgm') !== 'false') {
		restart ? bgmSource.start(0) : bgmSource.start()
	}
	bgmSource.onended = () => {
		bgmSource.disconnect()
		bgmSource = undefined
	}
}

function stopBGM() {
	try {if (bgmSource) bgmSource.stop()} catch(e){}
}

function playSE(buffer, loop=false) {
	if (!audioContext || !buffer) return
	const src = audioContext.createBufferSource()
	src.buffer = buffer
	src.loop = loop
	src.connect(seGain)
	src.start(0)
	src.onended = () => {
		src.disconnect()
	}
}

window.onresize = () => resizeScene()
window.visualViewport.onresize = () => resizeScene()
window.visualViewport.onscroll = () => resizeScene()
document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	loadModels()
	classSelection()
}
document.onclick = () => {
	if (userInteracted) return
	initAudio()
	userInteracted = true
}
document.onvisibilitychange = () => {
	if (document.hidden) stopBGM()
	else playBGM()
}
document.body.appendChild(renderer.domElement)