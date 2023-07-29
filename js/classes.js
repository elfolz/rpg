export default {
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
	'espada curta': {
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
	'espada grande': {
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
	cajado: {
		idle: 'idle(stick)',
		walk: 'walk(stick)',
		run: 'stick_RUN',
		attack1: 'attack1(stick)'
	},
	arco: {
		idle: 'bow_IDLE',
		idleArmed: 'bow_IDLE_ARMED',
		walk: 'walk(bow)',
		run: 'bow_RUN',
		load: 'bow_LOAD',
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