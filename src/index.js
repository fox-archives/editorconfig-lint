import { dirname, isAbsolute, join } from 'path'
import { readFile } from 'fs/promises'
import minimist from 'minimist'
import editorconfig from 'editorconfig'

const argv = minimist(process.argv.slice(2))
if (argv['help'] || argv['h']) {
	console.info(`editorconfig-lint: Tool to lint .editorconfig files

Commands:
  lint
    Lint editorconfig file

Options:
  --formatter: Formatter to use for printing lint output (unix (default), visualstudio)
  -f, --file: Location of .editorconfig file
  -h, --help: Show help`)
	process.exit(0)
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

let formatter = 'unix'
if(argv['formatter']) {
	formatter = argv['formatter']
} else if (argv['formatter'] !== undefined) {
	console.error(`Error: Formatter '${argv['formatter']}' not recognized`)
	process.exit(1)
}


const subcommand = argv._[0]
if (subcommand === 'lint') {
	// Use file ending of underscore to match [*]
	const filePath = join(dirname(editorConfigFile), '_._')
	const result = await editorconfig.parseFromFiles(filePath, Promise.resolve([{
		name: editorConfigFile,
		contents: await readFile(editorConfigFile, 'utf8'),
	}]))
	if (result.indent_style !== 'tab') {
		printError(0, 0, 'default-indent-style', "Default indent_style must be set to tab")
	}
	if (result.indent_size !== 'unset') {
		printError(0, 0, 'default-indent-size', "Default indent_style must be unset")
	}
	if (result.tab_width !== undefined) {
		printError(0, 0, 'default-tab-width', "Default tab_width must not be set")
	}
	if (result.end_of_line !== 'lf') {
		printError(0, 0, 'default-end-of-line', "Default end_of_line must be 'lf'")
	}
	if (result.charset !== 'utf-8') {
		printError(0, 0, 'default-charset', "Default charset must be set to 'utf-8'")
	}
	if (result.trim_trailing_whitespace !== true) {
		printError(0, 0, 'default-trim_trailing-whitespace', "Default trim_trailing_whitespace must be set to 'true'")
	}
	if (result.insert_final_newline !== true) {
		printError(0, 0, 'default-insert-final-newline', "Default insert_final_newline must be set to 'true'")
	}

	// Read File
	const editorConfigFileContents = (await readFile(editorConfigFile, 'utf8'))

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
} else if (subcommand === undefined) {
	console.error(`Error: No subcommand passed`)
	process.exitCode = 1
} else {
	console.info(`Error: Subcommand '${subcommand}' not valid`)
	process.exitCode = 1
}

/**
 * @param {number} rowIndex
 * @param {number} columnIndex
 * @param {string} code
 * @param {string} summary
 */
function printError(rowIndex, columnIndex, code, summary) {
	if (formatter === 'unix') {
		console.log(`${editorConfigFile}:${rowIndex}:${columnIndex}: ${summary}. [Error/${code}]`)
	} else if (formatter === 'visualstudio') {
		console.log(`${editorConfigFile}(${rowIndex},${columnIndex}): error ${code} : ${summary}.`)
	}
}
