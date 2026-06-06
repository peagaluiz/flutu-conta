import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Skeleton } from "@/components/ui/skeleton";

export function InsertFormSkeleton({ isDarkMode }) {
	const blockStyle = {
		backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
		borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E2E8F0",
	};
	return (
		<VStack className="gap-4 p-3">
			<Box className="w-full rounded-md border p-5" style={blockStyle}>
				<VStack className="gap-3">
					<Skeleton className="h-6 w-52 rounded-md" />
					<Skeleton className="h-4 w-36 rounded-sm" />
					<Skeleton className="h-11 w-full rounded-md" />
					<Skeleton className="h-4 w-24 rounded-sm" />
					<Skeleton className="h-11 w-full rounded-md" />
					<Skeleton className="h-4 w-20 rounded-sm" />
					<Skeleton className="h-10 w-full rounded-md" />
					<Skeleton className="h-4 w-28 rounded-sm" />
					<Skeleton className="h-10 w-full rounded-md" />
					<Skeleton className="h-4 w-32 rounded-sm" />
					<Skeleton className="h-10 w-full rounded-md" />
				</VStack>
			</Box>
			<Box className="w-full rounded-md border p-5" style={blockStyle}>
				<VStack className="gap-2">
					<Skeleton className="h-4 w-24 rounded-sm" />
					<Skeleton className="h-28 w-full rounded-md" />
				</VStack>
			</Box>
			<HStack className="w-full justify-end" space="md">
				<Skeleton className="h-11 w-28 rounded-md" />
				<Skeleton className="h-11 w-32 rounded-md" />
			</HStack>
		</VStack>
	);
}
