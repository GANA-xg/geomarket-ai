import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		notation: compact ? 'compact' : 'standard',
		maximumFractionDigits: compact ? 1 : 2,
	}).format(value);
}

export function formatPercent(value: number) {
	return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function timeAgo(date: Date | string | number) {
	const input = new Date(date).getTime();
	const diff = Date.now() - input;
	const minutes = Math.round(diff / 60000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	return `${days}d ago`;
}
