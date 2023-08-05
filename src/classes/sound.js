'use strict'

import { AudioListener } from 'three'

export class Sound {

	constructor() {
		this.initialized = false
		this.audio = new Audio()
		this.audioContext = new AudioContext()
		this.bgmVolume = 0.25
		this.seVolume = 1
		this.guiSEs = ['bow', 'energyball', 'great-sword', 'humanYell', 'stick', 'sword', 'zombieYell', 'roulette']
		this.ses = []
		this.load()
	}

	load() {
		fetch('./audio/bgm/bgm.mp3', {cache: 'force-cache'})
		.then(response => {
			response.arrayBuffer()
			.then(buffer => {
				this.audioContext.decodeAudioData(buffer)
				.then(audioData => {
					this.bgmBuffer = audioData
					if (this.initialized) this.playBGM()
				})
			})
		})
		/* fetch('./audio/me/gameover.mp3', {cache: 'force-cache'})
		.then(response => {
			response.arrayBuffer()
			.then(buffer => {
				this.audioContext.decodeAudioData(buffer)
				.then(audioData => {
					this.gameoverBuffer = audioData
				})
			})
		}) */
		this.guiSEs.forEach(el => {
			fetch(`./audio/se/${el}.mp3`, {cache: 'force-cache'})
			.then(response => {
				response.arrayBuffer()
				.then(buffer => {
					this.audioContext.decodeAudioData(buffer)
					.then(audioData => {
						this.ses[el] = audioData
					})
				})
			})
		}, this)
	}

	init() {
		if (this.initialized) return
		this.bgmGain = this.audioContext.createGain()
		this.bgmGain.gain.value = this.bgmVolume
		this.seGain = this.audioContext.createGain()
		this.seGain.gain.value = this.seVolume
		this.bgmGain.connect(this.audioContext.destination)
		this.seGain.connect(this.audioContext.destination)
		const destination = this.audioContext.createMediaStreamDestination()
		this.audio.srcObject = destination.stream
		this.audio.play()
		this.audioListener = new AudioListener()
		this.audioListener.setMasterVolume(this.seVolume)
		if (window.game) window.game.camera.add(this.audioListener)
		this.playBGM()
		this.initialized = true
	}

	playBGM(restart=true) {
		if (window.game.gameover || !this.audioContext || !this.bgmBuffer) return
		this.bgmSource = this.audioContext.createBufferSource()
		this.bgmSource.buffer = this.bgmBuffer
		this.bgmSource.loop = true
		this.bgmSource.connect(this.bgmGain)
		if (localStorage.getItem('bgm') !== 'false') {
			restart ? this.bgmSource.start(0) : this.bgmSource.start()
		}
		this.bgmSource.onended = () => {
			this.bgmSource.disconnect()
			this.bgmSource = undefined
		}
	}

	stopBGM() {
		try {if (this.bgmSource) this.bgmSource.stop()} catch(e){}
	}

	playME(buffer) {
		if (!this.initialized || !buffer) return
		this.stopBGM()
		this.meSource = this.audioContext.createBufferSource()
		this.meSource.buffer = buffer
		this.meSource.connect(this.bgmGain)
		this.bgmGain.gain.value = this.seVolume
		this.meSource.start(0)
		this.meSource.onended = () => {
			this.bgmGain.gain.value = document.hidden ? 0 : this.bgmVolume
			this.meSource?.disconnect()
			this.meSource = undefined
			this.playBGM(false)
		}
	}

	playSE(buffer, loop=false, srcObject) {
		if (!this.initialized || !this.audioContext || !buffer) return
		const src = this.audioContext.createBufferSource()
		src.buffer = buffer
		src.loop = loop
		src.connect(this.seGain)
		src.start(0)
		src.onended = () => {
			src.disconnect()
			if (srcObject) srcObject.sePlaying = false
		}
		return src
	}

	playSEbyName(se) {
		if (this.ses[se]) this.playSE(this.ses[se])
	}

	playClick() {
		this.playSE(this.ses['click'])
	}

	playCursor() {
		this.playSE(this.ses['cursor'])
	}

	playCancel() {
		this.playSE(this.ses['cancel'])
	}

	toggleVisibility() {
		if (document.hidden) {
			if (this.bgmGain) this.bgmGain.gain.value = 0
			if (this.seGain) this.seGain.gain.value = 0
			this.audioListener?.setMasterVolume(0)
		} else {
			if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume
			if (this.seGain) this.seGain.gain.value = this.seVolume
			this.audioListener?.setMasterVolume(this.seVolume)
		}
	}

}