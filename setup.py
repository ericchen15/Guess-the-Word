import cx_Freeze
import os

os.environ['TCL_LIBRARY'] = 'C:/Python36/tcl/tcl8.6'
os.environ['TK_LIBRARY'] = 'C:/Python36/tcl/tk8.6'

executables = [cx_Freeze.Executable('animation_game.py')]
files = ['JW63/', 'word_task_list.txt']
packages = ['pygame', 'pandas', 'audiolabel', 're', 'random', 'numpy']

cx_Freeze.setup(
	name='Guess the Word',
	options={'build_exe': {'include_files': files, 'packages': packages}},
	executables=executables)