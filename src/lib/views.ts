import type { Post, Project } from './db';

/**
 * Adapters that shape SQLite rows like the old content-collection entries
 * (`CollectionEntry` style) so the existing site components
 * (PostItem, PostsByYear, ProjectList, …) keep working unchanged.
 */

export type PostView = {
	id: string;
	slug: string;
	title: string;
	seoTitle: string | null;
	description: string;
	bodyMd: string;
	tags: string[];
	coverImage: string | null;
	pubDate: Date;
	updatedDate: Date | null;
	status: string;
};

export function postView(post: Post): PostView {
	return {
		id: post.slug,
		slug: post.slug,
		title: post.title,
		seoTitle: post.seo_title,
		description: post.description,
		bodyMd: post.body_md,
		tags: post.tags ?? [],
		coverImage: post.coverUrl,
		pubDate: post.pubDate ?? new Date(0),
		updatedDate: post.updatedDate,
		status: post.status
	};
}

export type ProjectView = {
	id: string;
	slug: string;
	title: string;
	description: string;
	repoURL: string | null;
	demoURL: string | null;
	tags: string[];
	coverImage: string | null;
	pubDate: Date;
	status: string;
};

export function projectView(project: Project): ProjectView {
	return {
		id: project.slug,
		slug: project.slug,
		title: project.title,
		description: project.description,
		repoURL: project.repo_url,
		demoURL: project.demo_url,
		tags: project.tags ?? [],
		coverImage: project.coverUrl,
		pubDate: project.pubDate ?? new Date(0),
		status: project.status
	};
}

function withData(p: PostView) {
	return { id: p.id, slug: p.slug, data: p };
}
function withDataProject(p: ProjectView) {
	return { id: p.id, slug: p.slug, data: p };
}

export function postViews(posts: Post[]): Array<ReturnType<typeof withData>> {
	return posts.map((p) => withData(postView(p)));
}

export function projectViews(projects: Project[]): Array<ReturnType<typeof withDataProject>> {
	return projects.map((p) => withDataProject(projectView(p)));
}
