
import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";
import Admin from "./Admin";

// COLLECTIONS
const collections = [
  {
    name: "FOR HER",
    description: "Elegant. Feminine. Unforgettable.",
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=900&q=85",
  },
  {
    name: "FOR HIM",
    description: "Bold. Sophisticated. Timeless.",
    image:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=900&q=85",
  },
  {
    name: "UNISEX",
    description: "Distinctive scents without boundaries.",
    image:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?w=900&q=85",
  },
];

// INDIVIDUAL PRODUCT CARD
function ProductCard({ product, onAddToCart }) {
  const [selectedSize, setSelectedSize] = useState("");
  const [sizeError, setSizeError] = useState(false);

  const price = selectedSize
    ? product.prices[selectedSize]
    : null;

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      return;
    }

    onAddToCart({
      id: product.id,
      name: product.name,
      image: product.image,
      size: selectedSize,
      price: price,
    });

    setSizeError(false);
  };

  return (
    <article className="product-card">
      <div className="product-image">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
        />

        <span
          className={`product-status ${
            product.available ? "in-stock" : "sold-out"
          }`}
        >
          {product.status}
        </span>
      </div>

      <div className="product-info">
        <p className="product-category">
          ORVÈLIS EXCLUSIVE
        </p>

        <h3>{product.name}</h3>

        <p className="product-description">
          {product.description}
        </p>

        <div className="size-selector">
          <p className="size-label">SELECT YOUR SIZE</p>

          <div
            className={`size-options ${
              sizeError ? "size-error" : ""
            }`}
          >
            {Object.keys(product.prices).map((size) => (
              <button
                type="button"
                key={size}
                className={`size-option ${
                  selectedSize === size ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedSize(size);
                  setSizeError(false);
                }}
                aria-pressed={selectedSize === size}
              >
                {size}
              </button>
            ))}
          </div>

          {sizeError && (
            <p className="size-error-message" role="alert">
              Please select a perfume size.
            </p>
          )}
        </div>

        <div className="product-price">
          <span>PRICE</span>
          <strong>
            {price !== null
              ? `Rs. ${price.toLocaleString("en-LK")}`
              : "SELECT A SIZE"}
          </strong>
        </div>

        {product.available ? (
          <button
            type="button"
            className="product-button add-to-cart-button"
            onClick={handleAddToCart}
          >
            ADD TO CART <span>+</span>
          </button>
        ) : (
          <span className="product-button unavailable">
            CURRENTLY UNAVAILABLE
          </span>
        )}
      </div>
    </article>
  );
}

function App() {
  // PRODUCTS FROM SUPABASE
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  // CART STATES
  const [cart, setCart] = useState([]);
  const [cartMessage, setCartMessage] = useState("");

  // CHECKOUT STATES
  // Restore confirmation if the original page reloads.
  const [orderSubmitted, setOrderSubmitted] = useState(
    () => sessionStorage.getItem("orvelisOrderSubmitted") === "true"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [whatsappLink, setWhatsappLink] = useState(
    () => sessionStorage.getItem("orvelisWhatsappLink") || ""
  );

  // FETCH PRODUCTS FROM SUPABASE
  useEffect(() => {
    if (window.location.pathname === "/admin") {
      return;
    }

    const fetchProducts = async () => {
      setProductsLoading(true);
      setProductsError("");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Product loading error:", error);

        setProductsError(
          "We couldn't load our fragrances. Please refresh the page."
        );

        setProductsLoading(false);
        return;
      }

      const formattedProducts = (data || []).map((product) => {
        const available =
          (product.availability || "").toUpperCase() === "AVAILABLE";

        return {
          id: product.id,
          name: product.name,
          image: product.image,
          description: product.description || "",
          status: available ? "AVAILABLE" : "SOLD OUT",
          available,
          prices: product.prices || {},
        };
      });

      setProducts(formattedProducts);
      setProductsLoading(false);
    };

    fetchProducts();
  }, []);

  // ADD TO CART
  const addToCart = (item) => {
    setCart((previousCart) => {
      const existingItem = previousCart.find(
        (cartItem) =>
          cartItem.name === item.name &&
          cartItem.size === item.size
      );

      if (existingItem) {
        return previousCart.map((cartItem) =>
          cartItem.name === item.name &&
          cartItem.size === item.size
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [
        ...previousCart,
        {
          ...item,
          quantity: 1,
        },
      ];
    });

    setCartMessage(`${item.name} added to your cart.`);

    setTimeout(() => {
      setCartMessage("");
    }, 5000);
  };

  // CART COUNT
  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // UPDATE QUANTITY
  const updateQuantity = (name, size, change) => {
    setCart((previousCart) =>
      previousCart
        .map((item) =>
          item.name === name && item.size === size
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // REMOVE FROM CART
  const removeFromCart = (name, size) => {
    setCart((previousCart) =>
      previousCart.filter(
        (item) => !(item.name === name && item.size === size)
      )
    );
  };

  // CART TOTALS
  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const deliveryCharge = cart.length > 0 ? 400 : 0;

  const grandTotal = subtotal + deliveryCharge;

  // ADMIN PAGE
  if (window.location.pathname === "/admin") {
    return <Admin />;
  }

  // CHECKOUT SUBMISSION
  const handleCheckoutSubmit = async (event) => {
    event.preventDefault();

    if (cart.length === 0) {
      alert("Your shopping bag is empty.");
      return;
    }

    // Open a separate tab during the original user click.
    // This helps prevent popup blockers after the Supabase request.
    const whatsappWindow = window.open("about:blank", "_blank");

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData(event.currentTarget);

      const customer = Object.fromEntries(formData.entries());

      const orderItems = cart.map((item) => ({
        name: item.name,
        size: item.size,
        price: item.price,
        quantity: item.quantity,
      }));

      // SAVE ORDER TO SUPABASE
      const { error } = await supabase
        .from("orders")
        .insert([
          {
            customer_name: customer.fullName,
            customer_phone: customer.phone,
            customer_email: customer.email || null,
            delivery_address: customer.address,
            district: customer.district,
            order_items: orderItems,
            subtotal: subtotal,
            delivery_charge: deliveryCharge,
            total: grandTotal,
            special_notes: customer.notes || null,
          },
        ]);

      if (error) {
        throw error;
      }

      // PREPARE WHATSAPP MESSAGE
      const orderMessage = orderItems
        .map(
          (item) =>
            `${item.name} - ${item.size} x ${item.quantity} = Rs. ${(
              item.price * item.quantity
            ).toLocaleString("en-LK")}`
        )
        .join("\n");

      const message = `
NEW ORVÈLIS ORDER

CUSTOMER DETAILS
Name: ${customer.fullName}
Phone: ${customer.phone}
Email: ${customer.email || "Not provided"}
Address: ${customer.address}
District: ${customer.district}

ORDER DETAILS
${orderMessage}

Subtotal: Rs. ${subtotal.toLocaleString("en-LK")}
Delivery: Rs. ${deliveryCharge.toLocaleString("en-LK")}
TOTAL: Rs. ${grandTotal.toLocaleString("en-LK")}

Special Notes: ${customer.notes || "None"}
`;

      const whatsappURL =
        `https://wa.me/94761519446?text=${encodeURIComponent(message)}`;

      // SAVE CONFIRMATION FOR THE ORIGINAL PAGE
      sessionStorage.setItem("orvelisOrderSubmitted", "true");
      sessionStorage.setItem("orvelisWhatsappLink", whatsappURL);

      setWhatsappLink(whatsappURL);
      setOrderSubmitted(true);

      // OPEN WHATSAPP IN THE SEPARATE TAB
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.href = whatsappURL;
      } else {
        // If the browser blocks the popup, the confirmation
        // page still provides the WhatsApp link as a fallback.
        console.warn("The browser blocked the WhatsApp popup.");
      }

    } catch (error) {
      console.error("Order submission error:", error);

      // Close the temporary tab if saving failed.
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }

      setSubmitError(
        "We couldn't save your order. Please try again or contact us through WhatsApp."
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="website">

      {/* NAVIGATION */}
      <header className="navbar">
        <a className="brand" href="#home">
          ORVÈLIS
        </a>

        <nav className="nav-links">
          <a href="#cart">CART ({cartCount})</a>
          <a href="#home">HOME</a>
          <a href="#collections">COLLECTIONS</a>
          <a href="#products">FRAGRANCES</a>
          <a href="#story">OUR STORY</a>
          <a href="#contact">CONTACT</a>
        </nav>

        <a href="#products" className="nav-button">
          DISCOVER
        </a>
      </header>

      {cartMessage && (
        <p
          className="cart-message"
          role="status"
          aria-live="polite"
        >
          {cartMessage}
        </p>
      )}

      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <p className="eyebrow">
            THE ART OF FINE FRAGRANCE
          </p>

          <h1>
            <span>EXPERIENCE</span>
            <br />
            <span>PURE LUXURY.</span>
          </h1>

          <p className="hero-description">
            Discover the world of authentic luxury fragrances,
            thoughtfully selected and beautifully presented.
          </p>

          <a href="#products" className="gold-button">
            EXPLORE COLLECTION <span>→</span>
          </a>
        </div>

        <div className="hero-bottom">
          <span>AUTHENTIC LUXURY PERFUME DECANTS</span>
          <span>EST. ORVÈLIS</span>
        </div>
      </section>

      {/* INTRO */}
      <section className="intro">
        <p className="eyebrow">
          THE ORVÈLIS EXPERIENCE
        </p>

        <h2>
          Luxury is not just what you wear.
          <br />
          <span>It is what you leave behind.</span>
        </h2>

        <p className="intro-description">
          Experience exceptional fragrances from the world's most
          celebrated perfume houses. Discover your signature scent
          with ORVÈLIS.
        </p>
      </section>

      {/* COLLECTIONS */}
      <section className="collections" id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR SIGNATURE</p>
            <h2>THE COLLECTIONS</h2>
          </div>

          <p>Discover a fragrance that tells your story.</p>
        </div>

        <div className="collection-grid">
          {collections.map((item) => (
            <article
              className="collection-card"
              key={item.name}
            >
              <div className="collection-image">
                <img
                  src={item.image}
                  alt={`${item.name} perfume collection`}
                />

                <div className="image-shade"></div>

                <div className="collection-info">
                  <p>{item.description}</p>
                  <h3>{item.name}</h3>
                  <a href="#products">DISCOVER MORE ↗</a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FRAGRANCE EDIT */}
      <section className="products" id="products">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              CURATED FOR YOUR SENSES
            </p>
            <h2>THE FRAGRANCE EDIT</h2>
          </div>

          <p>Exceptional fragrances. Authentic experiences.</p>
        </div>

        {productsLoading ? (
          <div className="admin-empty">
            Loading our fragrance collection...
          </div>
        ) : productsError ? (
          <div className="admin-error">
            {productsError}
          </div>
        ) : products.length === 0 ? (
          <div className="admin-empty">
            Our fragrance collection is being updated.
            Please check back soon.
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}
      </section>

      {/* SHOPPING CART */}
      <section className="cart-section" id="cart">
        <div className="section-heading">
          <p className="eyebrow">YOUR SELECTION</p>
          <h2>
            SHOPPING <span>BAG.</span>
          </h2>
          <p>
            Review your chosen fragrances before checkout.
          </p>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <h3>YOUR BAG IS EMPTY</h3>
            <p>Discover a fragrance that speaks to you.</p>

            <a href="#products" className="cart-shop-button">
              EXPLORE FRAGRANCES
            </a>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              {cart.map((item) => {
                const product = products.find(
                  (product) => product.name === item.name
                );

                return (
                  <div
                    className="cart-item"
                    key={`${item.name}-${item.size}`}
                  >
                    <img
                      src={product?.image || item.image}
                      alt={item.name}
                    />

                    <div className="cart-item-details">
                      <h3>{item.name}</h3>

                      <p>
                        {item.size} · Rs.{" "}
                        {item.price.toLocaleString("en-LK")}
                      </p>

                      <div className="cart-quantity">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.name,
                              item.size,
                              -1
                            )
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.name,
                              item.size,
                              1
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="cart-item-end">
                      <strong>
                        Rs.{" "}
                        {(
                          item.price * item.quantity
                        ).toLocaleString("en-LK")}
                      </strong>

                      <button
                        type="button"
                        className="remove-cart-item"
                        onClick={() =>
                          removeFromCart(
                            item.name,
                            item.size
                          )
                        }
                      >
                        REMOVE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cart-summary">
              <h3>ORDER SUMMARY</h3>

              <div>
                <span>Subtotal</span>
                <span>
                  Rs. {subtotal.toLocaleString("en-LK")}
                </span>
              </div>

              <div>
                <span>Delivery</span>
                <span>
                  Rs. {deliveryCharge.toLocaleString("en-LK")}
                </span>
              </div>

              <div className="cart-total">
                <strong>TOTAL</strong>
                <strong>
                  Rs. {grandTotal.toLocaleString("en-LK")}
                </strong>
              </div>

              <button
                type="button"
                className="checkout-button"
                onClick={() => {
                  document
                    .getElementById("checkout")
                    .scrollIntoView({
                      behavior: "smooth",
                    });
                }}
              >
                PROCEED TO CHECKOUT
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CHECKOUT */}
      <section className="checkout-section" id="checkout">
        <div className="section-heading">
          <p className="eyebrow">ALMOST YOURS</p>
          <h2>
            SECURE <span>YOUR ORDER.</span>
          </h2>
          <p>
            Enter your details to place your ORVÈLIS order.
          </p>
        </div>

        <div className="checkout-container">
          <form
            className="checkout-form"
            style={{
              display: orderSubmitted ? "none" : "block",
            }}
            onSubmit={handleCheckoutSubmit}
          >
            <h3>DELIVERY INFORMATION</h3>

            <div className="form-group">
              <label htmlFor="customerName">
                FULL NAME
              </label>

              <input
                type="text"
                id="customerName"
                name="fullName"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerEmail">
                EMAIL ADDRESS (OPTIONAL)
              </label>

              <input
                type="email"
                id="customerEmail"
                name="email"
                placeholder="Enter your email address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerPhone">
                PHONE NUMBER
              </label>

              <input
                type="tel"
                id="customerPhone"
                name="phone"
                placeholder="07XXXXXXXX"
                pattern="0[0-9]{9}"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerAddress">
                DELIVERY ADDRESS
              </label>

              <textarea
                id="customerAddress"
                name="address"
                placeholder="House number, street, city"
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerDistrict">
                DISTRICT
              </label>

              <input
                type="text"
                id="customerDistrict"
                name="district"
                placeholder="Enter your district"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerNote">
                ORDER NOTES (OPTIONAL)
              </label>

              <textarea
                id="customerNote"
                name="notes"
                placeholder="Any special delivery instructions?"
                rows="3"
              />
            </div>

            {submitError && (
              <p
                className="checkout-error"
                role="alert"
              >
                {submitError}
              </p>
            )}

            <button
              type="submit"
              className="checkout-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "SAVING YOUR ORDER..."
                : "SUBMIT ORDER"}
            </button>
          </form>

          {/* ORDER CONFIRMATION */}
          {orderSubmitted && (
            <div className="order-confirmation">
              <p className="eyebrow">
                THANK YOU FOR CHOOSING ORVÈLIS
              </p>

              <h3>
                YOUR ORDER REQUEST{" "}
                <span>HAS BEEN RECEIVED.</span>
              </h3>

              <p className="confirmation-success">
                YOUR ORDER HAS BEEN SUCCESSFULLY SAVED!
              </p>

              <p>
                Thank you for shopping with ORVÈLIS.
                Your order details have been saved.
                Please send your prepared order message
                through WhatsApp if it has not already
                been sent.
              </p>

              <h4>WHAT HAPPENS NEXT?</h4>

              <p>
                1. Our team will review your order and
                contact you shortly.
              </p>

              <p>
                2. We will contact you through WhatsApp
                with our bank transfer details.
              </p>

              <p>
                3. Once your payment is completed and
                verified, we will confirm your order and
                arrange delivery.
              </p>

              <p className="confirmation-note">
                Your order will be confirmed after payment
                verification. Thank you for trusting
                ORVÈLIS.
              </p>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="checkout-button"
              >
                OPEN WHATSAPP AGAIN
              </a>
            </div>
          )}
        </div>
      </section>

      {/* STORY */}
      <section className="story" id="story">
        <div className="story-image">
          <img
            src="https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=1000&q=85"
            alt="Luxury fragrance display"
          />
        </div>

        <div className="story-content">
          <p className="eyebrow">
            A WORLD OF FRAGRANCE
          </p>

          <h2>
            DISCOVER THE BEAUTY OF EVERY DROP.
          </h2>

          <p>
            At ORVÈLIS, we believe everyone deserves to
            experience extraordinary fragrances. Our
            decants let you explore authentic luxury scents
            in convenient sizes before choosing your
            favourite.
          </p>

          <a href="#products" className="text-link">
            EXPLORE OUR WORLD →
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact">
        <a className="footer-brand" href="#home">
          ORVÈLIS
        </a>

        <p>THE ART OF FINE FRAGRANCE.</p>

        <div className="footer-links">
          <a href="#home">HOME</a>
          <a href="#collections">COLLECTIONS</a>
          <a href="#products">FRAGRANCES</a>
          <a href="#story">OUR STORY</a>
        </div>

        <div className="footer-line"></div>

        <small>
          © 2026 ORVÈLIS. ALL RIGHTS RESERVED.
        </small>
      </footer>

    </div>
  );
}

export default App;
