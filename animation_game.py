import pygame
import pandas as pd
import audiolabel as al
import re
import random

width = 900
height = 600

black = (0, 0, 0)
white = (255, 255, 255)
red = (255, 0, 0)
red0 = (200, 0, 0)
green = (0, 255, 0)
green0 = (0, 200, 0)
blue = (0, 0, 255)
blue0 = (0, 0, 200)

jwdir = 'JW63/'
pal_xy = jwdir + 'pal.dat'
pha_xy = jwdir + 'pha.dat'

wordTasks = []
with open('word_task_list.txt', 'r') as f:
	for line in f:
		line = line.split('\t')
		wordTasks.append([line[0], line[1].strip()])

pal_df = pd.read_csv(pal_xy, sep = '\s+', names = ['x', 'y'])
pal_df = pal_df * 1e-3

pha_df = pd.read_csv(pha_xy, sep = '\s+', names = ['x', 'y'])
pha_df = pha_df * 1e-3

xMin = min(pha_df.x)
yMin = min(pha_df.y)
yMax = max(pal_df.y)
scale = 360 / (yMax - yMin)

gen = None
options = None
correctIndex = None
frames = 30

numCorrect = 0
total = 0
defaultFont = 'helvetica'

introText = []
introText.append('black line: pharyngeal wall')
introText.append('black curve: palate')
introText.append('blue: tongue')
introText.append('red: mandible')
introText.append('green: lips')
introText.append('animations are at .375 speed')
introText.append('source: Westbury, J.R. (1994)  X-ray Microbeam Speech Production Database User’s Handbook. Waisman Center')
introText.append('on Mental Retardation and Human Development, University of Wisconsin, Madison, WI.')

# takes and returns [x, y]
def changeBasis(point):
	return [int(round(scale * (point[0] - xMin) + 20)), int(round(scale * (yMax - point[1]) + 20))]

def textObjects(text, font):
	textSurf = font.render(text, True, black)
	return textSurf, textSurf.get_rect()

def button(msg, x, y, w, h, ic, ac, fontSize = 20):
	mouse = pygame.mouse.get_pos()
	click = pygame.mouse.get_pressed()
	clicked = False

	if x + w > mouse[0] > x and y + h > mouse[1] > y:
		pygame.draw.rect(window, ac,(x ,y, w, h))
		if click[0] == 1 and frames >= 30:
			clicked = True
	else:
		pygame.draw.rect(window, ic,(x, y, w, h))

	textSurf, textRect = textObjects(msg, pygame.font.SysFont(defaultFont, fontSize))
	textRect.center = ((x + (w / 2)), (y + (h / 2)))
	window.blit(textSurf, textRect)
	return clicked

def drawPalPha():
	pygame.draw.lines(window, black, False, palPoints, 1)
	pygame.draw.lines(window, black, False, phaPoints, 1)
	for point in palPoints + phaPoints:
		pygame.draw.circle(window, black, point, 3)

def drawMoving(sel):
	while True:
		for i in range(15):
			yield

		for i, row in sel.iterrows():
			tongue = [changeBasis(point) for point in [[row.T1x, row.T1y], [row.T2x, row.T2y], [row.T3x, row.T3y], [row.T4x, row.T4y]]]
			jaw = [changeBasis(point) for point in [[row.MIx, row.MIy], [row.MMx, row.MMy]]]
			lips = [changeBasis(point) for point in [[row.ULx, row.ULy], [row.LLx, row.LLy]]]
			pygame.draw.lines(window, blue, False, tongue, 1)
			for point in tongue:
				pygame.draw.circle(window, blue, point, 3)
			for point in jaw:
				pygame.draw.circle(window, red, point, 3)
			for point in lips:
				pygame.draw.circle(window, green, point, 3)
			yield

		for i in range(15):
			yield

def newWord():
	hasNull = True
	while hasNull:
		rand = random.choice(wordTasks)
		word = re.compile(rand[0].upper())
		task = jwdir + rand[1]

		tg = task + '.TextGrid'
		wav = task + '.wav'
		txy = task + '.txy'

		pm = al.LabelManager(from_file = tg, from_type = 'praat')
		df = pd.read_csv(txy, sep = '\t', na_values = "1000000",
			names = ['time', 'ULx', 'ULy', 'LLx', 'LLy', 'T1x', 'T1y', 'T2x', 'T2y','T3x', 'T3y', 'T4x', 'T4y', 'MIx', 'MIy', 'MMx', 'MMy'])

		df = df * 1e-3  # convert xy to mm, and time values to msec
		df['time'] = df['time'] * 1e-3   # Convert to seconds
		df['sec'] = df['time']
		df = df.set_index(['sec'])

		for word in pm.tier('word').search(word):
			t1idx = df.index.get_loc(word.t1 - .1, method = 'nearest')
			t2idx = df.index.get_loc(word.t2 + .1, method = 'nearest')
			sel = df.iloc[t1idx:t2idx]

		hasNull = sel.isnull().values.any()

	setGlobal(sel, rand[0])

def setGlobal(sel, word):
	global gen, options, correctIndex
	gen = drawMoving(sel)

	options = set([word])
	while len(options) < 4:
		randWord = random.choice(wordTasks)[0]
		options.add(randWord)

	options = list(options)
	random.shuffle(options)
	correctIndex = options.index(word)

def optionButtons():
	locations = [[20, 420], [(width / 2) + 20, 420], [20, 520], [(width / 2) + 20, 520]]
	clicked = -1
	for i in range(len(options)):
		if button(options[i], locations[i][0], locations[i][1], 300, 60, green, green0, 40):
			clicked = i
	return clicked

def score():
	scoreText = str(numCorrect) + '/' + str(total)
	TextSurf, TextRect = textObjects(scoreText, pygame.font.SysFont(defaultFont, 20))
	TextRect.bottomright = (width - 20, height - 20)
	window.blit(TextSurf, TextRect)

def intro():
	remain = True
	while remain:
		checkExit()
		window.fill(white)

		remain = not button('begin', (width / 2) - 100, 400, 200, 100, green, green0, 40)

		for row in range(len(introText)):
			TextSurf, TextRect = textObjects(introText[row], pygame.font.SysFont(defaultFont, 20))
			TextRect.topleft = (20, 20 + row * 40)
			window.blit(TextSurf, TextRect)

		pygame.display.update()
		clock.tick(60)

	newWord()

def animation():
	remain = True
	correct = False
	global frames
	frames = 0

	while remain:
		frames += 1
		checkExit()
		window.fill(white)

		drawPalPha()
		next(gen)
		score()
		clicked = optionButtons()
		if clicked >= 0:
			remain = False
			if clicked == correctIndex:
				correct = True

		pygame.display.update()
		clock.tick(60)

	return correct

def answer(correct):
	remain = True
	global frames
	frames = 0

	while remain:
		frames += 1
		checkExit()
		window.fill(white)

		if correct:
			TextSurf, TextRect = textObjects('Correct!', pygame.font.SysFont(defaultFont, 50))
		else:
			TextSurf, TextRect = textObjects('The correct answer was ' + options[correctIndex], pygame.font.SysFont(defaultFont, 50))
		TextRect.center = (width / 2, height / 2)
		window.blit(TextSurf, TextRect)

		if button('next', (width / 2) - 75, height - 100, 150, 50, green, green0):
			newWord()
			remain = False

		pygame.display.update()
		clock.tick(60)

	global numCorrect
	global total
	if correct:
		numCorrect += 1
	total += 1

def checkExit():
	for event in pygame.event.get():
		if event.type == pygame.QUIT:
			pygame.quit()
			quit()

pygame.init()

window = pygame.display.set_mode((width, height))
pygame.display.set_caption('Guess the Word')
clock = pygame.time.Clock()

palPoints = [changeBasis(point) for point in pal_df.values.tolist()]
phaPoints = [changeBasis(point) for point in pha_df.values.tolist()]

intro()
while True:
	correct = animation()
	answer(correct)