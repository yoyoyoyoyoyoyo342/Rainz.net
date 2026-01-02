import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import rainzLogo from '@/assets/rainz-logo-new.png';
import { ArticleAd, ArticleTopAd, ArticleBottomAd } from '@/components/ui/article-adsense';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
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
      }
    } catch (error) {
      console.error('Error loading post:', error);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  // Insert ads between paragraphs of content
  const renderContentWithAds = useMemo(() => {
    if (!post?.content) return [];
    
    const lines = post.content.split('\n');
    const result: React.ReactNode[] = [];
    let paragraphCount = 0;
    
    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('### ')) {
        result.push(<h3 key={index} className="text-xl font-semibold mt-6 mb-3 text-foreground">{line.slice(4)}</h3>);
      } else if (line.startsWith('## ')) {
        result.push(<h2 key={index} className="text-2xl font-bold mt-8 mb-4 text-foreground">{line.slice(3)}</h2>);
      } else if (line.startsWith('# ')) {
        result.push(<h1 key={index} className="text-3xl font-bold mt-8 mb-4 text-foreground">{line.slice(2)}</h1>);
      } else if (line.trim() === '') {
        result.push(<br key={index} />);
      } else {
        // Regular paragraph
        result.push(<p key={index} className="text-muted-foreground mb-4 leading-relaxed">{line}</p>);
        paragraphCount++;
        
        // Insert ad after every 4 paragraphs
        if (paragraphCount > 0 && paragraphCount % 4 === 0) {
          result.push(<ArticleAd key={`ad-${index}`} format="fluid" />);
        }
      }
    });
    
    return result;
  }, [post?.content]);

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

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        {/* Top Ad */}
        <ArticleTopAd />

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full h-64 object-cover rounded-lg mb-8"
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

          <div className="prose prose-invert max-w-none">
            {renderContentWithAds}
          </div>
        </article>

        {/* Bottom Ad */}
        <ArticleBottomAd />
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Rainz. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
