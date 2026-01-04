import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { ArticleTopAd, ArticleBottomAd } from '@/components/ui/article-adsense';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

const POSTS_PER_PAGE = 6;

export default function Articles() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['published-articles', page],
    queryFn: async () => {
      const from = (page - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      const { data: posts, error, count } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, cover_image_url, published_at, created_at', { count: 'exact' })
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { posts: posts || [], totalCount: count || 0 };
    },
  });

  const posts = data?.posts || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Rainz Articles</h1>
            <p className="text-muted-foreground">Latest news and updates from the Rainz team</p>
          </div>
        </div>

        {/* Top Ad */}
        <ArticleTopAd className="mb-8" />

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden animate-pulse">
                <div className="h-48 bg-muted" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-muted-foreground text-lg">No articles published yet.</p>
              <p className="text-sm text-muted-foreground mt-2">Check back soon for updates!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/articles/${post.slug}`}
                  className="block"
                >
                  <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group h-full">
                    {post.cover_image_url ? (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-4xl">📰</span>
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h2 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(post.published_at || post.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Bottom Ad */}
            <ArticleBottomAd className="mt-8" />
          </>
        )}
      </div>
    </div>
  );
}
