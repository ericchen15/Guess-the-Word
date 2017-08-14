const canvas = document.getElementById('guess');
const context = canvas.getContext('2d');

var mouseX = 0;
var mouseY = 0;
var click = false;

const root = 'https://raw.githubusercontent.com/ericchen15/Guess-the-Word/master/';
const speakers = ['JW62/', 'JW63/'];

var sel = [];
var options = [];
var correctIndex = -1;
var clickIndex = -1;
var numCorrect = 0;
var total = 0;
var frame = 0;
var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                            window.webkitRequestAnimationFrame || window.msRequestAnimationGFrame;

const wordTasks = read_csv(root + 'word_task_list.txt', '\t');
var speaker;
var xMin;
var yMin;
var yMax;
var scale;
var palPoints;
var phaPoints;

introText = [];
introText.push('made by: Eric Chen')
introText.push('black line: pharyngeal wall (back of throat)')
introText.push('black curve: palate (roof of mouth)')
introText.push('blue: tongue')
introText.push('red: mandible (jawbone)')
introText.push('green: lips')
introText.push('source: Westbury, J.R. (1994)  X-ray Microbeam Speech Production Database User\'s Handbook. Waisman Center on Mental')
introText.push('Retardation and Human Development, University of Wisconsin, Madison, WI.')

function getText(url){
	var text;
	$.get({
		url: url,
		success: function(data){
			text = data;
		},
		dataType: 'text',
		async: false
	});
	return text;
}

function read_csv(csv, sep){
	var raw = getText(csv);
	return $.csv.toArrays(raw, {'separator': sep});
}

function getColumn(arr, col){
	return arr.map(function(row){
		return row[col];
	});
}

function stringsToInts(strings){
	return strings.map(function(row){
		return row.map(function(value){
			return parseInt(value);
		})
	});
}

function changeBasis(point){
	return [scale * (point[0] - xMin) + 20, scale * (yMax - point[1]) + 20];
}

function drawLine(line, color){
	context.beginPath();
	context.strokeStyle = color;
	context.moveTo(...line[0])
	for (i = 1; i < line.length; i++){
		context.lineTo(...line[i]);
	}
	context.stroke();
}

function drawPoints(points, color, radius){
	points.map(function(point){
		context.beginPath();
		context.fillStyle = color;
		context.arc(point[0], point[1], radius, 0, 2 * Math.PI);
		context.fill();
	});
}

function drawPalPha(){
	drawLine(palPoints, 'black');
	drawLine(phaPoints, 'black');
	drawPoints(palPoints, 'black', 2);
	drawPoints(phaPoints, 'black', 2);
}

function drawMoving(row){
	var paired = [];
	for (i = 1; i < row.length - 1; i += 2){
		paired.push([row[i], row[i + 1]]);
	}

	var lips = [changeBasis(paired[0]), changeBasis(paired[1])];
	var tongue = [changeBasis(paired[2]), changeBasis(paired[3]), changeBasis(paired[4]), changeBasis(paired[5])];
	var jaw = [changeBasis(paired[6]), changeBasis(paired[7])];

	drawLine(tongue, 'blue');
	drawPoints(tongue, 'blue', 3);
	drawPoints(jaw, 'red', 3);
	drawPoints(lips, 'green', 3);
}

function button(msg, x, y, w, h, ic, ac, fontSize = 20){
	var buttonClick = false;
	context.fillStyle = ic;
	if (x < mouseX && mouseX < x + w && y < mouseY && mouseY < y + h){
		context.fillStyle = ac;
		if (click){
			buttonClick = true;
		}
	}
	context.fillRect(x, y, w, h);
	context.fillStyle = 'black';
	context.font = fontSize + 'px Arial';
	context.textAlign = 'center';
	context.fillText(msg, x + (w / 2), y + (h / 2) + (fontSize / 4));
	return buttonClick;
}

function optionButtons(){
	var locations = [[20, 420], [320, 420], [20, 520], [320, 520]];
	for (i = 0; i < options.length; i++) {
		if (button(options[i], locations[i][0], locations[i][1], 250, 60, 'gold', 'orange', 40)){
			clickIndex = i;
		}
	}
}

function optionRects(){
	var locations = [[20, 420], [320, 420], [20, 520], [320, 520]];
	var color;
	for (i = 0; i < options.length; i++) {
		if (i == correctIndex){
			color = 'lime';
		} else if (i == clickIndex){
			color = 'red';
		} else {
			color = 'gold';
		}
		button(options[i], locations[i][0], locations[i][1], 250, 60, color, color, 40);
	}
}

function randomElement(arr){
	return arr[Math.floor(Math.random() * arr.length)];
}

function newWord(){
	newSpeaker();
	var repeat = true;
	while (repeat){
		var rand = randomElement(wordTasks);
		var word = rand[0];
		var task = speaker + rand[1];

		var txy = stringsToInts(read_csv(task + '.txy', '\t'));
		var tg = getText(task + '.TextGrid');

		var times = wordToTimes(word, tg);
		if (times[0] >= 0 && times[1] >= 0){
			repeat = false;
			sel = [];
			for (i = 0; i < txy.length; i++) {
				var row = txy[i];
				var secs = row[0] / 1000000;
				if (times[0] - .1 < secs && secs < times[1] + .1){
					if (row.indexOf(1000000) != -1){
						repeat = true;
					} else {
						sel.push(row);
					}
				}
			}
		}
	}
	makeOptions(word);
}

function wordToTimes(word, tg){
	var t1 = -1;
	var t2 = -1;
	var lines = tg.split('\n');
	for (i = 2; i < lines.length; i++) {
		if (lines[i].includes('text') && lines[i].includes(word.toUpperCase())){
			var t1Line = lines[i - 2].replace(/\s+/, '').split('=');
			t1 = parseFloat(t1Line[t1Line.length - 1]);
			var t2Line = lines[i - 1].replace(/\s+/, '').split('=');
			t2 = parseFloat(t2Line[t2Line.length - 1]);
		}
	}
	return [t1, t2];
}

function makeOptions(word){
	options = [];
	options.push(word);
	while (options.length < 4){
		var randWord = randomElement(wordTasks)[0];
		if (options.indexOf(randWord) == -1){
			options.push(randWord);
		}
	}
	shuffleArray(options);
	correctIndex = options.indexOf(word);
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function score(){
	context.fillStyle = 'black';
	context.font = '20px Arial';
	context.textAlign = 'right';
	context.fillText(numCorrect + '/' + total, canvas.width - 20, canvas.height - 20);
}

function intro(){
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = 'black';
	context.font = '80px Arial';
	context.textAlign = 'center';
	context.fillText('Guess the Word', canvas.width / 2, 100);

	context.font = '16px Arial';
	context.textAlign = 'left';
	for (i = 0; i < introText.length; i++){
		context.fillText(introText[i], 20, 150 + (30 * i));
	}
	buttonClick = button('begin', (canvas.width / 2) - 100, 400, 200, 100, 'cyan', 'deepskyblue', 40);

	click = false;
	if (buttonClick){
		newWord();
		animate();
		return;
	}
	requestAnimationFrame(intro);
}

function animate(){
	context.clearRect(0, 0, canvas.width, canvas.height);
	drawPalPha();
	if (15 <= frame && frame < 15 + sel.length){
		drawMoving(sel[frame - 15]);
	}
	score();
	optionButtons();

	click = false;
	if (clickIndex >= 0){
		if (clickIndex == correctIndex){
			numCorrect++;
		}
		total++;
		answer();
		return;
	}
	if (frame++ >= sel.length + 30){
		frame = 0;
	}
	requestAnimationFrame(animate);
}

function answer(){
	context.clearRect(0, 0, canvas.width, canvas.height);
	drawPalPha();
	if (15 <= frame && frame < 15 + sel.length){
		drawMoving(sel[frame - 15]);
	}
	score();
	optionRects();
	buttonClick = button('next', 620, 420, 250, 60, 'cyan', 'deepskyblue', 40);

	click = false;
	if (buttonClick){
		newWord();
		frame = 0;
		clickIndex = -1;
		animate();
		return;
	}
	if (frame++ >= sel.length + 30){
		frame = 0;
	}
	requestAnimationFrame(answer);
}

function addEvent(element, eventName, callback){
	if (element.addEventListener) {
		element.addEventListener(eventName, callback);
	} else if (element.attachEvent) {
		element.attachEvent('on' + eventName, callback);
	}
}

function newSpeaker(){
	speaker = root + randomElement(speakers);
	var pal = stringsToInts(read_csv(speaker + 'PAL.csv', ','));
	var pha = stringsToInts(read_csv(speaker + 'PHA.csv', ','));

	xMin = Math.min(...getColumn(pha, 0));
	yMin = Math.min(...getColumn(pha, 1));
	yMax = Math.max(...getColumn(pal, 1));
	scale = 360 / (yMax - yMin);

	palPoints = pal.map(changeBasis);
	phaPoints = pha.map(changeBasis);
}

addEvent(document, 'click', function(e){
	click = true;
});

addEvent(document, 'mousemove', function(e){
	mouseX = e.pageX;
	mouseY = e.pageY;
});

intro();