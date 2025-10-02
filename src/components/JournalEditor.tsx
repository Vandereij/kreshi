// src/components/JournalEditor.tsx
"use client";

import { Textarea, ActionIcon, Tooltip } from "@mantine/core";
import { IconMicrophone, IconMicrophoneOff } from "@tabler/icons-react";

interface JournalEditorProps {
	value: string;
	onChange: (value: string) => void;
	moodLabel: string | undefined;
	isListening: boolean;
	onToggleListening: () => void;
}

export function JournalEditor({
	value,
	onChange,
	moodLabel,
	isListening,
	onToggleListening,
}: JournalEditorProps) {
	return (
		<div style={{ position: "relative" }}>
			<Textarea
				value={value}
				onChange={(event) => onChange(event.currentTarget.value)}
				placeholder={
					moodLabel
						? `Tell me more about feeling ${moodLabel.toLowerCase()}...` :
						`What's on your mind?`
				}
				minRows={5}
				autosize
			/>
			<Tooltip
				label={isListening ? "Stop listening" : "Start listening"}
				position="top"
				withArrow
			>
				<ActionIcon
					onClick={onToggleListening}
					style={{
						position: "absolute",
						bottom: "10px",
						right: "10px",
					}}
					variant={isListening ? "filled" : "subtle"}
					color={isListening ? "red" : "gray"}
				>
					{isListening ? (
						<IconMicrophoneOff size={18} />
					) : (
						<IconMicrophone size={18} />
					)}
				</ActionIcon>
			</Tooltip>
		</div>
	);
}