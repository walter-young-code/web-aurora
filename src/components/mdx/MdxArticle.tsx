import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { ImageGallery } from '../media/ImageGallery';
import { LazyVideoEmbed } from '../media/LazyVideoEmbed';

/**
 * MDX 正文只允许这两类自定义组件；
 * 排版样式在这里用 token 显式映射，不引入 @tailwindcss/typography 的默认配色。
 */
const components = {
  ImageGallery,
  LazyVideoEmbed,
  h2: (props: React.ComponentProps<'h2'>) => (
    <h2
      className="mt-xl mb-sm font-display text-heading-card text-text-primary"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<'h3'>) => (
    <h3 className="mt-lg mb-xs font-display text-body-md text-text-primary" {...props} />
  ),
  p: (props: React.ComponentProps<'p'>) => (
    <p className="my-md max-w-prose text-body-prose text-text-secondary" {...props} />
  ),
  ul: (props: React.ComponentProps<'ul'>) => (
    <ul
      className="my-md flex list-disc flex-col gap-xs pl-lg text-body-prose text-text-secondary"
      {...props}
    />
  ),
  ol: (props: React.ComponentProps<'ol'>) => (
    <ol
      className="my-md flex list-decimal flex-col gap-xs pl-lg text-body-prose text-text-secondary"
      {...props}
    />
  ),
  blockquote: (props: React.ComponentProps<'blockquote'>) => (
    <blockquote
      className="my-md border-l-2 border-line pl-md text-body-prose italic text-text-secondary"
      {...props}
    />
  ),
  a: (props: React.ComponentProps<'a'>) => (
    <a
      className="text-accent underline underline-offset-4 transition-opacity duration-micro hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: (props: React.ComponentProps<'strong'>) => (
    <strong className="text-text-primary" {...props} />
  ),
  hr: (props: React.ComponentProps<'hr'>) => <hr className="my-xl border-line" {...props} />,
  code: (props: React.ComponentProps<'code'>) => (
    <code
      className="rounded-badge border border-line bg-bg-elevated px-xxs text-meta-caption text-text-primary"
      {...props}
    />
  ),
};

export function MdxArticle({ source }: { source: string }) {
  const { content } = matter(source);
  return (
    <div className="text-body-md">
      <MDXRemote source={content} components={components} />
    </div>
  );
}
