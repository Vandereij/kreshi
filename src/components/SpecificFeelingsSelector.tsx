// src/components/SpecificFeelingsSelector.tsx
"use client";

import {
	Button,
	Chip,
	Group,
	Modal,
	ScrollArea,
	TextInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { allFeelings } from "@/data/feelings";
import { IconPlus, IconSearch } from "@tabler/icons-react";

// 1. The props have changed. It now receives the list of feelings to show.
interface SpecificFeelingsSelectorProps {
	availableFeelings: string[];
	value: string[];
	onChange: (feelings: string[]) => void;
}

export function SpecificFeelingsSelector({
	availableFeelings,
	value,
	onChange,
}: SpecificFeelingsSelectorProps) {
	// --- Modal State ---
	const [opened, { open, close }] = useDisclosure(false);
	const [searchTerm, setSearchTerm] = useState("");

	const toggleFeeling = (feeling: string) => {
		const newValue = value.includes(feeling)
			? value.filter((f) => f !== feeling)
			: [...value, feeling];
		onChange(newValue);
	};

	// Filter the master list based on the search term
	const filteredFeelings = allFeelings.filter((f) =>
		f.toLowerCase().includes(searchTerm.toLowerCase())
	);

	return (
		<>
			<Group gap="xs" wrap="wrap">
				{/* 2. We now map over the `availableFeelings` prop */}
				{availableFeelings.map((feeling) => {
					const isSelected = value.includes(feeling);
					return (
						<Button
							key={feeling}
							variant={isSelected ? "filled" : "subtle"}
							color={isSelected ? "brand-charcoal" : "gray"}
							onClick={() => toggleFeeling(feeling)}
							styles={(theme) => ({
								root: {
									backgroundColor: isSelected
										? theme.colors["brand-charcoal"][8]
										: theme.colors["brand-beige"][1],
									color: isSelected
										? theme.white
										: theme.black,
									"&:hover": {
										backgroundColor: isSelected
											? theme.colors["brand-charcoal"][7]
											: theme.colors["brand-beige"][2],
									},
								},
							})}
						>
							{feeling}
						</Button>
					);
				})}
				{value
					.filter((f) => !availableFeelings.includes(f))
					.map((feeling) => (
						<Button
							key={feeling}
							variant="filled"
							onClick={() => toggleFeeling(feeling)}
							styles={(theme) => ({
								root: {
									backgroundColor:
										theme.colors["brand-charcoal"][8],
									color: theme.white,
									"&:hover": {
										backgroundColor:
											theme.colors["brand-charcoal"][7],
									},
								},
							})}
						>
							{feeling}
						</Button>
					))}

				<Button
					variant="subtle"
					onClick={open}
					leftSection={<IconPlus size={14} />}
					styles={(theme) => ({
						root: {
							backgroundColor: theme.colors["brand-beige"][2],
						},
					})}
				>
					Add / Search
				</Button>
			</Group>
			<Modal
				opened={opened}
				onClose={close}
				title="Find a Feeling"
				centered
			>
				<TextInput
					placeholder="Search feelings..."
					leftSection={<IconSearch size={16} />}
					value={searchTerm}
					onChange={(event) =>
						setSearchTerm(event.currentTarget.value)
					}
					mb="md"
				/>
				<ScrollArea h={300}>
					<Group gap="xs">
						{filteredFeelings.map((feeling) => (
							<Chip
								key={feeling}
								checked={value.includes(feeling)}
								onChange={() => toggleFeeling(feeling)}
								variant="filled"
							>
								{feeling}
							</Chip>
						))}
					</Group>
				</ScrollArea>
			</Modal>
		</>
	);
}
