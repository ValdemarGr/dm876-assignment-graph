const arr = require('./context')
const fs = require('fs');

let o = {};

for (let x of arr) {
	let filtered = {id: x.id, name: x.name, born: x.born, died: x.died};
	if (o[filtered.id] === undefined) {
		o[filtered.id] = filtered
	} else {
		o[filtered.id].push(filtered)
	}
}

fs.writeFile("filtered.json", JSON.stringify(o));
