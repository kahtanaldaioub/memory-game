const leaderboardKey = 'memory-match-scores';
const maxScores = 5;

window.memoryStorage = {
	getScores: () => JSON.parse(localStorage.getItem(leaderboardKey) || '[]')
		.sort((first, second) => second.points - first.points)
		.slice(0, maxScores),
	saveScores: (scores) => {
		const bestScores = scores
			.sort((first, second) => second.points - first.points)
			.slice(0, maxScores);
		localStorage.setItem(leaderboardKey, JSON.stringify(bestScores));
	}
};
