import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import rainzLogo from '@/assets/rainz-logo-new.png';
import { SEOHead } from '@/components/seo/seo-head';
import { Breadcrumbs } from '@/components/seo/breadcrumbs';
import ReactMarkdown from 'react-markdown';

interface BlogPostType {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RelatedPost {
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPost();
    }
  }, [slug]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Post not found');
        } else {
          throw error;
        }
      } else {
        setPost(data);
        // Fetch related posts
        const { data: related } = await supabase
          .from('blog_posts')
          .select('title, slug, excerpt, published_at')
          .eq('is_published', true)
          .neq('slug', slug)
          .order('published_at', { ascending: false })
          .limit(3);
        setRelatedPosts(related || []);
      }
    } catch (error) {
      console.error('Error loading post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  // Inject Article schema with dateModified
  useEffect(() => {
    if (!post) return;
    const id = 'article-schema-ld';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.setAttribute('type', 'application/ld+json');
      document.head.appendChild(el);
    }
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.excerpt || `Read "${post.title}" on the Rainz Weather blog.`,
      image: post.cover_image_url || undefined,
      datePublished: post.published_at || post.created_at,
      dateModified: post.updated_at || post.published_at || post.created_at,
      url: `https://rainz.net/articles/${post.slug}`,
      author: { '@type': 'Organization', name: 'Rainz Weather', url: 'https://rainz.net' },
      publisher: {
        '@type': 'Organization',
        name: 'Rainz Weather',
        logo: { '@type': 'ImageObject', url: 'https://rainz.net/logo-icon.png' },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': `https://rainz.net/articles/${post.slug}` },
    };
    el.textContent = JSON.stringify(schema);
    return () => { el?.remove(); };
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{error || 'Post Not Found'}</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead 
        title={`${post.title} - Rainz Weather Blog`}
        description={post.excerpt || `Read "${post.title}" on the Rainz Weather blog. Weather insights, tips, and updates.`}
        keywords={`Rainz blog, weather article, ${post.title}, weather tips, weather news`}
        ogType="article"
        articlePublishedTime={post.published_at || post.created_at}
        ogImage={post.cover_image_url || undefined}
        canonicalUrl={`https://rainz.net/articles/${post.slug}`}
      />
      <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={rainzLogo} alt="Rainz" className="h-8 w-auto" />
            <span className="font-semibold text-foreground">Rainz Blog</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-3xl">
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/articles' },
          { label: post.title },
        ]} />

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-64 object-cover rounded-lg mb-8 mt-4"
            fetchPriority="high"
          />
        )}

        <article>
          <h1 className="text-4xl font-bold text-foreground mb-4">{post.title}</h1>
          
          {post.published_at && (
            <p className="text-muted-foreground mb-8">
              Published on {new Date(post.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}

          <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary prose-li:text-muted-foreground prose-table:text-muted-foreground prose-th:border prose-th:border-border prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </article>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Related Articles</h2>
            <div className="grid gap-4">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.slug}
                  to={`/articles/${rp.slug}`}
                  className="block p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <h3 className="font-medium text-foreground mb-1">{rp.title}</h3>
                  {rp.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{rp.excerpt}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Rainz. All rights reserved.</p>
        </div>
      </footer>
    </div>
    </>
  );
}
