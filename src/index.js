import { isAbsolute, join } from 'path'
import { readFile } from 'fs/promises'
import minimist from 'minimist'
import editorconfig from 'editorconfig'

const argv = minimist(process.argv.slice(2))
const file = join(process.cwd(), 'file.py')
const result = await editorconfig.parse(file)

if (argv['help'] || argv['h']) {
	console.info(`editorconfig-lint: Tool to lint .editorconfig files

Commands:
  lint
    Lint editorconfig file

Options:
  -f, --file: Location of .editorconfig file
  -h, --help: Show help`)
}

let editorConfigFile
if(argv['f'] || argv['file']) {
	editorConfigFile = argv['f'] || argv['file']
	if (!isAbsolute(editorConfigFile)) {
		editorConfigFile = join(process.cwd(), editorConfigFile)
	}
} else {
	editorConfigFile = join(process.cwd(), '.editorconfig')
}

// Read File
const editorConfigFileContents = (await readFile(editorConfigFile, {encoding: 'utf8'}))

// Start linting

if (editorConfigFileContents.slice(0, 11) !== 'root = true') {
	printError(0, 0, 'required-top-level-root-true', "The first 11 characters must be `root = true`")
}

let rowIndex = 1
let columnIndex = 1
for(let j = 1; j < editorConfigFileContents.length-1; ++j) {
	const char = editorConfigFileContents[j]
	const previousChar = editorConfigFileContents[j-1]
	const nextChar = editorConfigFileContents[j+1]

	if(char === '\n') {
		columnIndex = 0
		rowIndex++
	} else {
		columnIndex++
	}

	switch (char) {
	case '[':
		if(previousChar !== '\n') {
			printError(rowIndex, columnIndex, 'required-newline-before-start-bracket', "Newline before starting brackets is required")
		}

		if (nextChar === ' ' || nextChar === '\t') {
			printError(rowIndex, columnIndex, 'no-whitespace-after-start-bracket', "Whitespace after starting brackets is prohibited")
		}
		break
	case ']':
		if (previousChar === ' ' || previousChar === '\t') {
			printError(rowIndex, columnIndex, 'no-whitespace-before-end-bracket', 'Whitespace before ending brackets is prohibited')
		}

		if (nextChar !== '\n') {
			printError(rowIndex, columnIndex, 'required-newline-after-end-bracket', "Newline after ending brackets is required")
		}
		break
	case '=':
		if (previousChar !== ' ') {
			printError(rowIndex, columnIndex, 'required-space-before-equals', "Space before equals sign is required")
		}

		if (nextChar !== ' ') {
			printError(rowIndex, columnIndex, 'required-space-after-equals', "Space after equals sign is required")
		}
		break
	case '\n':
		if (nextChar === ' ' || nextChar === '\t') {
			printError(rowIndex, columnIndex, 'no-whitespace-after-newline', 'Whitespace after newline is prohibited')
		}
		break
	default:
		break
	}
}

/**
 * @param {number} rowIndex
 * @param {number} columnIndex
 * @param {string} code
 * @param {string} summary
 */
function printError(rowIndex, columnIndex, code, summary) {
	console.log(`${editorConfigFile}:${rowIndex}:${columnIndex}: ${summary}. [Error/${code}]`)
}
