// src/data/learningResources.ts

export interface LearningResource {
	title: string;
	description: string;
	url: string;
	type: 'Workbook' | 'Article' | 'Audio Guide' | 'Website';
	source: 'CCI' | 'NHS' | 'NIMH' | 'ADAA' | 'Mind';
}

// The fix is on this line: We are explicitly telling TypeScript the structure of this object.
export const resourcesByCategory: { [key: string]: LearningResource[] } = {
	"Understanding CBT": [
		{
			title: "What is CBT?",
			description: "A comprehensive and easy-to-understand explanation of Cognitive Behavioural Therapy.",
			url: "https://www.mind.org.uk/information-support/drugs-and-treatments/cognitive-behavioural-therapy-cbt/",
			type: 'Article',
			source: 'Mind'
		},
		{
			title: "Unhelpful Thinking Styles",
			description: "A detailed workbook to help you identify and challenge common negative thought patterns.",
			url: "https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Unhelpful-Thinking",
			type: 'Workbook',
			source: 'CCI'
		}
	],
	"Managing Anxiety": [
		{
			title: "Anxiety, Worry & Panic",
			description: "Learn about the nature of anxiety and practical strategies to manage it.",
			url: "https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Anxiety",
			type: 'Workbook',
			source: 'CCI'
		},
		{
			title: "Anxiety Control Training",
			description: "Audio guides from the NHS to help you control anxiety symptoms.",
			url: "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/moodzone-anxiety-control-training/",
			type: 'Audio Guide',
			source: 'NHS'
		}
	],
	"Coping with Depression": [
		{
			title: "Depression",
			description: "A NIMH brochure explaining the signs, symptoms, and treatments for depression.",
			url: "https://www.nimh.nih.gov/health/topics/depression",
			type: 'Website',
			source: 'NIMH'
		},
		{
			title: "Back from the Bluez",
			description: "A self-help workbook focused on CBT strategies for overcoming depression.",
			url: "https://www.cci.health.wa.gov.au/Resources/Looking-After-Yourself/Depression",
			type: 'Workbook',
			source: 'CCI'
		}
	]
};