import chalk from 'chalk';

export const logger = {
	success: (msg: string) => console.log(chalk.green(`\u2714 ${msg}`)),
	error: (msg: string) => console.error(chalk.red(`\u2716 ${msg}`)),
	warn: (msg: string) => console.warn(chalk.yellow(`\u26A0 ${msg}`)),
	info: (msg: string) => console.log(chalk.blue(`\u2139 ${msg}`)),
	cast: (msg: string) => console.log(`\uD83E\uDDD9 ${msg}`),
	inspect: (msg: string) => console.log(`\uD83D\uDD0D ${msg}`),
	sync: (msg: string) => console.log(`\uD83D\uDD04 ${msg}`),
	scry: (msg: string) => console.log(`\uD83D\uDD2E ${msg}`),
};
