export interface ExerciseResource {
	title: string;
	description: string;
	url: string;
	type: 'Worksheet' | 'Audio Guide' | 'Workbook' | 'Action Plan';
	source: 'CCI' | 'NHS' | 'Therapist Aid' | 'Mind';
}

export const exercisesByCategory: { [key: string]: ExerciseResource[] } = {
	"Challenging Negative Thoughts": [
		{
			title: "Thought Record Worksheet",
			description: "A classic CBT tool to identify, challenge, and reframe automatic negative thoughts.",
			url: "https://www.therapistaid.com/therapy-worksheet/cbt-thought-record",
			type: 'Worksheet',
			source: 'Therapist Aid'
		},
		{
			title: "Cognitive Distortions",
			description: "Learn to identify common unhelpful thinking patterns, such as black-and-white thinking or catastrophizing.",
			url: "https://www.therapistaid.com/therapy-worksheet/cognitive-distortions",
			type: 'Worksheet',
			source: 'Therapist Aid'
		},
        {
			title: "Unhelpful Thinking Styles Workbook",
			description: "A deep dive into identifying and challenging cognitive distortions with multiple exercises.",
			url: "https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Unhelpful-Thinking",
			type: 'Workbook',
			source: 'CCI'
		}
	],
	"Mindfulness and Relaxation": [
		{
			title: "Mindfulness of Breath",
			description: "A guided audio meditation to help you focus on the present moment and calm your mind.",
			url: "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/",
			type: 'Audio Guide',
			source: 'NHS'
		},
		{
			title: "Relaxation Techniques",
			description: "Practical tips and exercises from Mind to help you unwind and reduce stress.",
			url: "https.mind.org.uk/information-support/types-of-mental-health-problems/stress/relaxation-tips/",
			type: 'Action Plan',
			source: 'Mind'
		}
	],
	"Building Self-Esteem": [
		{
			title: "Improving Self-Esteem Workbook",
			description: "A comprehensive, multi-module workbook with dozens of exercises to help you build a more positive self-view.",
			url: "https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Self-Esteem",
			type: 'Workbook',
			source: 'CCI'
		},
        {
			title: "Positive Qualities Worksheet",
			description: "An exercise to help you identify your strengths and positive attributes.",
			url: "https://www.therapistaid.com/therapy-worksheet/positive-qualities",
			type: 'Worksheet',
			source: 'Therapist Aid'
		}
	]
};