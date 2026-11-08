# Page layout recipes

Complete, themeable compositions rendered by the production Portal renderer. These are documentation recipes, not connected starter portals. All people, addresses, orders and prices are fictional. No login, filtering, upload or business mutation is connected.

Copy the DataXML and [layout CSS](../styles/layouts.css), loading it after the bundled component styles. Keep the `portal-theme portal-layout` wrapper. The CSS uses inherited semantic tokens, so the same theme applies to components and layout. Replace illustrative actions with protected Portal flows; never activate them by simply removing `disabled`.

## Sign in

A welcoming account entry point with a branded panel, labelled fields and recovery guidance.

Components: `card`, `field`, `input`, `button`, `disclosure`.

Use your Portal authentication flow; never put credentials in query strings or client storage. The demo has no form or authentication endpoint. Fields are illustrative and the action is disabled.

[DataXML source](../examples/layout-sign-in.html) · [Rendered example](../rendered/layout-sign-in.html)

```xml
<main xmlns:t="urn:cococo:dataxml" class="portal-theme portal-layout layout-sign-in">
  <header class="recipe-header">
    <a class="recipe-brand" href="#page-content">
      <span aria-hidden="true">p.</span>
       Paper &amp; Form
    </a>
    <span class="recipe-header-label">Customer portal</span>
  </header>
  <div class="login-layout" id="page-content">
    <section class="login-story">
      <p class="recipe-kicker">YOUR NEXT GREAT IMPRESSION</p>
      <h1>
        Good ideas.
        <br/>
        Beautifully printed.
      </h1>
      <p>One place for your print projects, proofs and deliveries. A little less admin. A lot more possibility.</p>
      <div class="print-art print-art-cards" aria-hidden="true">
        <div class="print-sheet">
          <span>Paper &amp; Form</span>
          <strong>
            Make
            <br/>
            your mark.
          </strong>
          <i>Made to make an impression.</i>
        </div>
      </div>
      <div class="story-facts">
        <span>Thoughtfully made</span>
        <span>From first proof to final print</span>
      </div>
    </section>
    <section class="login-panel" aria-labelledby="login-title">
      <div>
        <p class="recipe-kicker">WELCOME BACK</p>
        <h2 id="login-title">Your projects start here.</h2>
        <p class="recipe-muted">Sign in to your Paper &amp; Form account.</p>
      </div>
      <div class="recipe-fields" role="group" aria-label="Example sign-in fields">
        <portal-component name="field">
          <portal-prop name="for" value="email"/>
          <portal-prop name="label" value="Email address"/>
          <portal-component name="input">
            <portal-prop name="id" value="email"/>
            <portal-prop name="name" value="email"/>
            <portal-prop name="type" value="email"/>
            <portal-prop name="value" value=""/>
            <portal-prop name="placeholder" value="you@company.com"/>
            <portal-prop name="autocomplete" value="off"/>
          </portal-component>
        </portal-component>
        <portal-component name="field">
          <portal-prop name="for" value="password"/>
          <portal-prop name="label" value="Password"/>
          <portal-component name="input">
            <portal-prop name="id" value="password"/>
            <portal-prop name="name" value="password"/>
            <portal-prop name="type" value="password"/>
            <portal-prop name="value" value=""/>
            <portal-prop name="autocomplete" value="off"/>
          </portal-component>
        </portal-component>
        <p class="recipe-muted recipe-small">Demo only. Please do not enter real credentials.</p>
        <portal-component name="button">
          <portal-prop name="disabled" t:value="true"/>
          <portal-prop name="size" value="lg"/>
          Sign in
        </portal-component>
      </div>
      <portal-component name="disclosure">
        <portal-fill name="summary">Need help signing in?</portal-fill>
        <p>In your portal, link this section to password recovery or your customer support team. This example has no authentication service.</p>
      </portal-component>
      <p class="recipe-small recipe-muted">New to Paper &amp; Form? Your account contact can invite you to the customer portal.</p>
      <p class="recipe-demo-note">Sample layout · Fictional data · Business actions are disabled</p>
    </section>
  </div>
</main>
```

## Print catalogue

A responsive product collection with filters, sorting and a distinctive editorial product grid.

Components: `card`, `field`, `input`, `select`, `checkbox`, `badge`, `button`.

Replace the six synthetic products with Lua loader output. Keep filter controls outside the results region; use a native GET form and a targeted live region when connecting search. This static example does not filter or navigate products.

[DataXML source](../examples/layout-catalogue.html) · [Rendered example](../rendered/layout-catalogue.html)

```xml
<main xmlns:t="urn:cococo:dataxml" class="portal-theme portal-layout layout-catalogue">
  <header class="recipe-header">
    <a class="recipe-brand" href="#page-content">
      <span aria-hidden="true">p.</span>
       Paper &amp; Form
    </a>
    <span class="recipe-header-label">Print shop</span>
  </header>
  <section class="catalog-hero" id="page-content">
    <div>
      <p class="recipe-kicker">PRINT SOMETHING GREAT</p>
      <h1>
        Ideas deserve
        <br/>
        a little paper.
      </h1>
      <p class="recipe-muted">
        Everyday essentials and unexpected favourites.
        <br/>
        Made to feel as good as they look.
      </p>
    </div>
    <div class="hero-stamp" aria-hidden="true">
      MAKE
      <br/>
      <em>it</em>
      <br/>
      TANGIBLE
    </div>
  </section>
  <div class="catalog-controls">
    <div class="catalog-search">
      <portal-component name="field">
        <portal-prop name="for" value="search"/>
        <portal-prop name="label" value="Find your next print"/>
        <portal-component name="input">
          <portal-prop name="id" value="search"/>
          <portal-prop name="name" value="search"/>
          <portal-prop name="type" value="search"/>
          <portal-prop name="value" value=""/>
          <portal-prop name="placeholder" value="Try business cards or booklets"/>
        </portal-component>
      </portal-component>
    </div>
    <div>
      <portal-component name="field">
        <portal-prop name="for" value="sort"/>
        <portal-prop name="label" value="Sort by"/>
        <portal-component name="select">
          <portal-prop name="id" value="sort"/>
          <portal-prop name="name" value="sort"/>
          <option>Recommended</option>
          <option>Price: low to high</option>
        </portal-component>
      </portal-component>
    </div>
  </div>
  <div class="catalog-layout">
    <aside class="catalog-filters" aria-labelledby="filters-title">
      <h2 id="filters-title">Made for your moment</h2>
      <portal-component name="disclosure">
        <portal-prop name="open" t:value="true"/>
        <portal-fill name="summary">Product categories</portal-fill>
        <div class="recipe-fields">
          <portal-component name="checkbox">
            <portal-prop name="name" value="category"/>
            <portal-prop name="value" value="all"/>
            <portal-prop name="checked" t:value="true"/>
            All products
          </portal-component>
          <portal-component name="checkbox">
            <portal-prop name="name" value="category"/>
            <portal-prop name="value" value="stationery"/>
            <portal-prop name="checked" t:value="false"/>
            Business stationery
          </portal-component>
          <portal-component name="checkbox">
            <portal-prop name="name" value="category"/>
            <portal-prop name="value" value="marketing"/>
            <portal-prop name="checked" t:value="false"/>
            Marketing &amp; events
          </portal-component>
          <portal-component name="checkbox">
            <portal-prop name="name" value="category"/>
            <portal-prop name="value" value="packaging"/>
            <portal-prop name="checked" t:value="false"/>
            Packaging &amp; labels
          </portal-component>
        </div>
      </portal-component>
      <p class="recipe-small recipe-muted">Search, sorting and filters are shown as composition examples. This static catalogue does not filter.</p>
    </aside>
    <section aria-labelledby="products-title">
      <div class="recipe-section-heading">
        <h2 id="products-title">The print collection</h2>
        <span class="recipe-muted recipe-small">6 products</span>
      </div>
      <div class="product-grid">
        <portal-component name="card">
          <div class="print-art print-art-cards" aria-hidden="true">
            <div class="print-sheet">
              <span>Paper &amp; Form</span>
              <strong>
                Hello.
                <br/>
                Again.
              </strong>
              <i>Made to make an impression.</i>
            </div>
          </div>
          <div class="product-copy">
            <div class="product-heading">
              <h3>Business cards</h3>
              <portal-component name="badge">
                <portal-prop name="variant" value="primary"/>
                Bestseller
              </portal-component>
            </div>
            <p class="recipe-muted">A small introduction. A lasting impression.</p>
            <div class="product-price">
              <span>
                From 
                <strong>£24</strong>
              </span>
              <span class="recipe-small recipe-muted">250 cards</span>
            </div>
            <portal-component name="button">
              <portal-prop name="disabled" t:value="true"/>
              <portal-prop name="variant" value="secondary"/>
              Configure business cards
            </portal-component>
          </div>
        </portal-component>
        <portal-component name="card">
          <div class="print-art print-art-poster" aria-hidden="true">
            <div class="print-sheet">
              <span>Paper &amp; Form</span>
              <strong>
                Something
                <br/>
                worth seeing.
              </strong>
              <i>Made to make an impression.</i>
            </div>
          </div>
          <div class="product-copy">
            <div class="product-heading">
              <h3>Art prints</h3>
            </div>
            <p class="recipe-muted">Big ideas, beautifully reproduced.</p>
            <div class="product-price">
              <span>
                From 
                <strong>£18</strong>
              </span>
              <span class="recipe-small recipe-muted">10 prints</span>
            </div>
            <portal-component name="button">
              <portal-prop name="disabled" t:value="true"/>
              <portal-prop name="variant" value="secondary"/>
              Configure art prints
            </portal-component>
          </div>
        </portal-component>
        <portal-component name="card">
          <div class="print-art print-art-book" aria-hidden="true">
            <div class="print-sheet">
              <span>Paper &amp; Form</span>
              <strong>
                A story
                <br/>
                to keep.
              </strong>
              <i>Made to make an impression.</i>
            </div>
          </div>
          <div class="product-copy">
            <div class="product-heading">
              <h3>Booklets</h3>
            </div>
            <p class="recipe-muted">Give your next chapter a proper home.</p>
            <div class="product-price">
              <span>
                From 
                <strong>£65</strong>
              </span>
              <span class="recipe-small recipe-muted">25 booklets</span>
            </div>
            <portal-component name="button">
              <portal-prop name="disabled" t:value="true"/>
              <portal-prop name="variant" value="secondary"/>
              Configure booklets
            </portal-component>
          </div>
        </portal-component>
        <portal-component name="card">
          <div class="print-art print-art-label" aria-hidden="true">
            <div class="print-sheet">
              <span>Paper &amp; Form</span>
              <strong>
                Good
                <br/>
                things.
              </strong>
              <i>Made to make an impression.</i>
            </div>
          </div>
          <div class="product-copy">
            <div class="product-heading">
              <h3>Product labels</h3>
            </div>
            <p class="recipe-muted">The finishing touch for something special.</p>
            <div class="product-price">
              <span>
                From 
                <strong>£32</strong>
              </span>
              <span class="recipe-small recipe-muted">100 labels</span>
            </div>
            <portal-component name="button">
              <portal-prop name="disabled" t:value="true"/>
              <portal-prop name="variant" value="secondary"/>
              Configure product labels
            </portal-component>
          </div>
        </portal-component>
        <portal-component name="card">
          <div class="print-art print-art-postcard" aria-hidden="true">
            <div class="print-sheet">
              <span>Paper &amp; Form</span>
              <strong>
                Wish you
                <br/>
                were here.
              </strong>
              <i>Made to make an impression.</i>
            </div>
          </div>
          <div class="product-copy">
            <div class="product-heading">
              <h3>Postcards</h3>
            </div>
            <p class="recipe-muted">A thoughtful note, delivered in colour.</p>
            <div class="product-price">
              <span>
                From 
                <strong>£29</strong>
              </span>
              <span class="recipe-small recipe-muted">100 postcards</span>
            </div>
            <portal-component name="button">
              <portal-prop name="disabled" t:value="true"/>
              <portal-prop name="variant" value="secondary"/>
              Configure postcards
            </portal-component>
          </div>
        </portal-component>
        <portal-component name="card">
          <div class="print-art print-art-fold" aria-hidden="true">
            <div class="print-sheet">
              <span>Paper &amp; Form</span>
              <strong>
                Meet your
                <br/>
                next idea.
              </strong>
              <i>Made to make an impression.</i>
            </div>
          </div>
          <div class="product-copy">
            <div class="product-heading">
              <h3>Folded leaflets</h3>
            </div>
            <p class="recipe-muted">More room for the details that matter.</p>
            <div class="product-price">
              <span>
                From 
                <strong>£42</strong>
              </span>
              <span class="recipe-small recipe-muted">250 leaflets</span>
            </div>
            <portal-component name="button">
              <portal-prop name="disabled" t:value="true"/>
              <portal-prop name="variant" value="secondary"/>
              Configure folded leaflets
            </portal-component>
          </div>
        </portal-component>
      </div>
    </section>
  </div>
  <p class="recipe-demo-note">Sample layout · Fictional data · Business actions are disabled</p>
</main>
```

## Order tracking

A clear production timeline, delivery details and an itemised order summary.

Components: `card`, `badge`, `table`, `disclosure`.

Fetch the order through an authorised Lua read handler scoped to the current PortalUser and customer membership. Treat the order reference as an identifier, not permission to view an order. Tracking and totals here are fictional.

[DataXML source](../examples/layout-order-tracking.html) · [Rendered example](../rendered/layout-order-tracking.html)

```xml
<main xmlns:t="urn:cococo:dataxml" class="portal-theme portal-layout layout-order-tracking">
  <header class="recipe-header">
    <a class="recipe-brand" href="#page-content">
      <span aria-hidden="true">p.</span>
       Paper &amp; Form
    </a>
    <span class="recipe-header-label">Your orders</span>
  </header>
  <div class="recipe-content" id="page-content">
    <p class="recipe-kicker">GOOD THINGS ARE ON THEIR WAY</p>
    <div class="recipe-page-heading">
      <div>
        <h1>Order PF–10482</h1>
        <p class="recipe-muted">Placed 04 November 2026 · Autumn studio collection</p>
      </div>
      <portal-component name="badge">
        <portal-prop name="variant" value="primary"/>
        In production
      </portal-component>
    </div>
    <div class="tracking-layout">
      <div class="recipe-stack">
        <portal-component name="card">
          <div class="delivery-heading">
            <div>
              <p class="recipe-kicker">ESTIMATED DELIVERY</p>
              <h2>Wednesday, 11 November</h2>
              <p class="recipe-muted">Your artwork is approved. We’re bringing it to life.</p>
            </div>
            <span class="delivery-symbol" aria-hidden="true">↗</span>
          </div>
          <ol class="order-timeline">
            <li class="is-complete">
              <span class="timeline-dot" aria-hidden="true">✓</span>
              <div>
                <h3>Order received</h3>
                <p>04 Nov · Your project is in safe hands.</p>
              </div>
            </li>
            <li class="is-complete">
              <span class="timeline-dot" aria-hidden="true">✓</span>
              <div>
                <h3>Artwork approved</h3>
                <p>05 Nov · Proof confirmed by Alex Morgan.</p>
              </div>
            </li>
            <li aria-current="step">
              <span class="timeline-dot" aria-hidden="true">3</span>
              <div>
                <h3>In production</h3>
                <p>06 Nov · Printing, finishing and checking every detail.</p>
              </div>
            </li>
            <li>
              <span class="timeline-dot" aria-hidden="true">4</span>
              <div>
                <h3>Dispatched</h3>
                <p>Tracking will appear here when your order ships.</p>
              </div>
            </li>
          </ol>
        </portal-component>
        <portal-component name="card">
          <p class="recipe-small recipe-muted">On smaller screens, scroll the table to view every column.</p>
      <portal-component name="table">
            <portal-prop name="caption" value="Your print order"/>
            <portal-fill name="head">
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Quantity</th>
                <th scope="col">Total</th>
              </tr>
            </portal-fill>
            <tr>
              <th scope="row">
                Business cards
                <br/>
                <span class="recipe-small recipe-muted">Soft-touch · 450gsm · Double-sided</span>
              </th>
              <td>500</td>
              <td>£48.00</td>
            </tr>
            <tr>
              <th scope="row">
                A5 postcards
                <br/>
                <span class="recipe-small recipe-muted">Uncoated · 350gsm · Full colour</span>
              </th>
              <td>250</td>
              <td>£55.00</td>
            </tr>
          </portal-component>
        </portal-component>
      </div>
      <aside class="recipe-stack" aria-label="Delivery and order details">
        <portal-component name="card">
          <portal-fill name="header">
            <h2>Delivering to</h2>
          </portal-fill>
          <address>
            Alex Morgan
            <br/>
            Studio North
            <br/>
            24 Example Lane
            <br/>
            Bristol BS1 2AB
            <br/>
            United Kingdom
          </address>
          <p class="recipe-small recipe-muted">Standard delivery · £6.00</p>
        </portal-component>
        <portal-component name="card">
          <portal-fill name="header">
            <h2>Order summary</h2>
          </portal-fill>
          <dl class="summary-list">
            <div>
              <dt>Print subtotal</dt>
              <dd>£103.00</dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>£6.00</dd>
            </div>
            <div>
              <dt>VAT (20%)</dt>
              <dd>£21.80</dd>
            </div>
            <div class="summary-total">
              <dt>Total paid</dt>
              <dd>£130.80</dd>
            </div>
          </dl>
        </portal-component>
        <portal-component name="disclosure">
          <portal-fill name="summary">Something changed?</portal-fill>
          <p>Production has started. In a live portal, contact your print team to discuss changes or delivery questions.</p>
        </portal-component>
      </aside>
    </div>
    <p class="recipe-demo-note">Sample layout · Fictional data · Business actions are disabled</p>
  </div>
</main>
```

## Order request

A guided product configuration with artwork guidance and an adjacent quote summary.

Components: `card`, `field`, `input`, `select`, `badge`, `alert`, `button`, `disclosure`.

Keep editable configuration outside the replaceable quote region. Calculate and validate prices on the server. Wire submission to a protected Lua action; group related writes in the platform transaction capability. Connect authorised Folder uploads separately; this sample does not accept files or orders.

[DataXML source](../examples/layout-order-request.html) · [Rendered example](../rendered/layout-order-request.html)

```xml
<main xmlns:t="urn:cococo:dataxml" class="portal-theme portal-layout layout-order-request">
  <header class="recipe-header">
    <a class="recipe-brand" href="#page-content">
      <span aria-hidden="true">p.</span>
       Paper &amp; Form
    </a>
    <span class="recipe-header-label">Create a print order</span>
  </header>
  <div class="recipe-content" id="page-content">
    <p class="recipe-kicker">SMALL DETAILS. BIG IMPRESSION.</p>
    <h1>Make it your business card.</h1>
    <p class="recipe-muted">Choose the finish, feel and format. We’ll take care of the print.</p>
    <div class="request-layout">
      <div class="recipe-stack">
        <div class="print-art print-art-cards" aria-hidden="true">
          <div class="print-sheet">
            <span>Paper &amp; Form</span>
            <strong>
              Studio
              <br/>
              North.
            </strong>
            <i>Made to make an impression.</i>
          </div>
        </div>
        <portal-component name="card">
          <portal-fill name="header">
            <h2>01 · The details</h2>
          </portal-fill>
          <div class="recipe-fields">
            <div class="recipe-field-grid">
              <portal-component name="field">
                <portal-prop name="for" value="size"/>
                <portal-prop name="label" value="Finished size"/>
                <portal-component name="select">
                  <portal-prop name="id" value="size"/>
                  <portal-prop name="name" value="size"/>
                  <option>85 × 55 mm · Standard</option>
                  <option>55 × 55 mm · Square</option>
                </portal-component>
              </portal-component>
              <portal-component name="field">
                <portal-prop name="for" value="paper"/>
                <portal-prop name="label" value="Paper &amp; finish"/>
                <portal-component name="select">
                  <portal-prop name="id" value="paper"/>
                  <portal-prop name="name" value="paper"/>
                  <option>450gsm · Soft-touch</option>
                  <option>350gsm · Uncoated</option>
                </portal-component>
              </portal-component>
              <portal-component name="field">
                <portal-prop name="for" value="quantity"/>
                <portal-prop name="label" value="Quantity"/>
                <portal-component name="input">
                  <portal-prop name="id" value="quantity"/>
                  <portal-prop name="name" value="quantity"/>
                  <portal-prop name="type" value="number"/>
                  <portal-prop name="value" value="500"/>
                  <portal-prop name="min" value="250"/>
                  <portal-prop name="step" value="250"/>
                  <portal-prop name="max" value="10000"/>
                </portal-component>
              </portal-component>
              <portal-component name="field">
                <portal-prop name="for" value="printing"/>
                <portal-prop name="label" value="Printing"/>
                <portal-component name="select">
                  <portal-prop name="id" value="printing"/>
                  <portal-prop name="name" value="printing"/>
                  <option>Double-sided colour</option>
                  <option>Single-sided colour</option>
                </portal-component>
              </portal-component>
            </div>
            <portal-component name="field">
              <portal-prop name="for" value="reference"/>
              <portal-prop name="label" value="Your project reference"/>
              <portal-component name="input">
                <portal-prop name="id" value="reference"/>
                <portal-prop name="name" value="reference"/>
                <portal-prop name="type" value="text"/>
                <portal-prop name="value" value="Autumn studio collection"/>
              </portal-component>
            </portal-component>
          </div>
        </portal-component>
        <portal-component name="card">
          <portal-fill name="header">
            <h2>02 · Your artwork</h2>
          </portal-fill>
          <p>Supply a print-ready PDF with 3 mm bleed. Keep important details at least 4 mm from the trim edge.</p>
          <portal-component name="alert">
            <portal-prop name="variant" value="info"/>
            This static example has no upload service. Connect your portal’s authorised Folder upload flow before accepting artwork.
          </portal-component>
          <portal-component name="disclosure">
            <portal-fill name="summary">Artwork checklist</portal-fill>
            <ul>
              <li>CMYK colour, with images at 300 dpi.</li>
              <li>Fonts embedded or converted to outlines.</li>
              <li>Front and back supplied as separate PDF pages.</li>
            </ul>
          </portal-component>
        </portal-component>
      </div>
      <aside class="recipe-stack request-summary" aria-label="Example quote">
        <portal-component name="card">
          <p class="recipe-kicker">YOUR PRINT, AT A GLANCE</p>
          <h2>Business cards</h2>
          <p class="recipe-muted">
            500 cards · 85 × 55 mm
            <br/>
            450gsm soft-touch · Double-sided
          </p>
          <portal-component name="badge">
            <portal-prop name="variant" value="neutral"/>
            Sample quote
          </portal-component>
          <dl class="summary-list">
            <div>
              <dt>Printing</dt>
              <dd>£48.00</dd>
            </div>
            <div>
              <dt>Standard delivery</dt>
              <dd>£6.00</dd>
            </div>
            <div>
              <dt>VAT (20%)</dt>
              <dd>£10.80</dd>
            </div>
            <div class="summary-total">
              <dt>Total</dt>
              <dd>£64.80</dd>
            </div>
          </dl>
          <p class="recipe-small recipe-muted">Estimated dispatch in 3–5 working days after artwork approval.</p>
          <portal-component name="button">
            <portal-prop name="disabled" t:value="true"/>
            <portal-prop name="size" value="lg"/>
            Review your order
          </portal-component>
          <p class="recipe-small recipe-muted">Illustrative pricing. Changing options does not recalculate this sample quote.</p>
        </portal-component>
        <portal-component name="disclosure">
          <portal-fill name="summary">What happens next?</portal-fill>
          <p>In a connected portal, the server recalculates your quote and validates artwork before accepting your order. Always confirm the final price before payment.</p>
        </portal-component>
      </aside>
    </div>
    <p class="recipe-demo-note">Sample layout · Fictional data · Business actions are disabled</p>
  </div>
</main>
```
