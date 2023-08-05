export default function(min, max, round=true) {
	let value = Math.random() * (max - min + 1) + min
	return round ? Math.floor(value) : value
}