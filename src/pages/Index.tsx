import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { CategoryShowcase } from "@/components/CategoryShowcase";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { products } from "@/data/products";
import heroImg from "@/assets/hero-cosmic.jpg";
import tshirtImg from "@/assets/product-tshirt-1.jpg";
import pantsImg from "@/assets/product-pants-1.jpg";
import hoodieImg from "@/assets/product-hoodie-1.jpg";

const Index = () => {
  const featuredProducts = products.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden mt-16">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImg})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <p className="text-sm tracking-[0.3em] text-primary mb-4 uppercase font-medium">
            Welcome to the Universe
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6">
            DEFINE YOUR
            <br />
            <span className="text-primary">UNIVERSE</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore our exclusive collection of premium streetwear and lifestyle products
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop">
              <Button size="lg" className="group">
                Shop Now
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/new">
              <Button size="lg" variant="outline">
                New Arrivals
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Category Showcase */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImg})` }}>
        </div>
        <CategoryShowcase 
          image={tshirtImg}
          title="T-SHIRTS"
          link="/shop?category=T-Shirts"
        />
        <CategoryShowcase 
          image={pantsImg}
          title="DENIMS"
          link="/shop?category=Bottoms"
          reverse
        />
        <CategoryShowcase 
          image={hoodieImg}
          title="HOODIES"
          link="/shop?category=Hoodies"
        />
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">
            Featured <span className="text-primary">Collection</span>
          </h2>
          <p className="text-muted-foreground">Handpicked essentials for your wardrobe</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/shop">
            <Button size="lg" variant="outline">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Banner Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="relative rounded-lg overflow-hidden h-96 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20"></div>
          <div className="relative z-10 text-center px-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
              NEW SEASON
              <br />
              <span className="text-primary">DROP</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Exclusive designs. Limited quantities.
            </p>
            <Link to="/new">
              <Button size="lg">
                Explore Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <PWAInstallPrompt />
    </div>
  );
};

export default Index;
