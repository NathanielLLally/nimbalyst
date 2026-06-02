import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock1Icon } from "lucide-react";

const posts = [
  {
    title: "The Future of Web Development",
    description: "Explore the advantages of serverless and how to implement it effectively.",
    date: "August 1, 2024",
    href: "#",
    imageSrc:
      "https://images.unsplash.com/photo-1646736722280-17b990b46195?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    title: "Mastering React Hooks: A Comprehensive Guide",
    description: "Explore the advantages of serverless and how to implement it effectively.",
    date: "July 25, 2024",
    href: "#",
    imageSrc:
      "https://images.unsplash.com/photo-1751646563987-d5720fb773cb?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  },
  {
    title: "Serverless Architectures: Benefits and Best Practices",
    description: "Explore the advantages of serverless and how to implement it effectively.",
    date: "July 18, 2024",
    href: "#",
    imageSrc:
      "https://images.unsplash.com/photo-1751093383900-dbf2a79169f8?q=80&w=880&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  }
];

export default function BlogSection() {
  return (
    <section className="py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <header className="mx-auto max-w-2xl space-y-2">
            <h2 className="font-heading text-4xl sm:text-5xl">Latest Blog Posts</h2>
            <p className="text-muted-foreground text-balance lg:text-lg">
              Stay up-to-date with our latest news, insights, and stories.
            </p>
          </header>
        </div>
        <div className="mx-auto grid gap-6 py-12 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Link className="group grid gap-4" href={post.href}>
              <Card key={i} className="hover:bg-muted/50 pt-0 shadow-none">
                <figure className="relative aspect-video overflow-hidden rounded-t-lg">
                  <Image
                    alt="blog post cover"
                    className="overflow-hidden object-cover transition-transform group-hover:scale-110"
                    fill
                    src={post.imageSrc}
                  />
                </figure>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-muted-foreground text-sm">{post.description}</p>
                  <time className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Clock1Icon className="size-3" />
                    {post.date}
                  </time>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
