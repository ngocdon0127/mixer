require('./init')
setTimeout(() => {
	require('./cron/update-db')
}, 2000)