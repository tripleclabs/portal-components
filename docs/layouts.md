# Page layout recipes

Complete, themeable compositions rendered by the production Portal renderer. These are documentation recipes, not connected starter portals. All people, addresses, orders and prices are fictional. No login, filtering, upload or business mutation is connected.

Copy the DataXML into a page template. The [layout CSS](../styles/layouts.css) is part of the host's bundled stylesheet, so a Portal page needs nothing else. Keep the `portal-theme portal-layout` wrapper. The CSS uses inherited semantic tokens, so the same theme applies to components and layout. Replace illustrative actions with protected Portal flows; never activate them by simply removing `disabled`.

## Print shop

A public storefront: a branded hero, a bestseller grid and a product page with paper options, quantity and a live estimate.

Components: `site-header`, `nav-link`, `hero`, `section`, `grid`, `product-card`, `media`, `badge`, `price`, `option-cards`, `option-card`, `quantity-input`, `estimate-panel`, `description-list`, `site-footer`.

Load products and prices with a read loader and pass server-formatted amounts to price. Put the options and quantity in a GET form targeting the estimate region (data-portal-region on the wrapper, data-portal-live on the form) with a status outlet outside it; recalculate the estimate in Lua on every change. Adding to the basket is a protected Lua action. The product band is plain section markup rather than the section component because a region cannot sit inside a component slot. This static example has no form, so nothing is calculated or submitted. The product illustrations under /examples/images/ exist only in this showcase: replace them with your own asset URLs.

[DataXML source](../examples/layout-shop.html) · [Rendered example](../rendered/layout-shop.html)

```xml
<div class="portal-theme portal-layout">
  <ui:site-header t:bind-sticky="true">
    <ui:fill name="brand">
      <a href="#top">
        <ui:icon name="layers" size="lg"/>
        Paper &amp; Form
      </a>
    </ui:fill>
    <ui:fill name="nav">
      <ui:nav-link href="#shop" t:bind-current="true">Shop</ui:nav-link>
      <ui:nav-link href="#business-cards">Business cards</ui:nav-link>
      <ui:nav-link href="#stationery">Stationery</ui:nav-link>
      <ui:nav-link href="#help">Help</ui:nav-link>
    </ui:fill>
    <ui:fill name="actions">
      <ui:link href="#basket" variant="button">
        <ui:icon name="shopping-cart" size="sm"/>
        Basket · 2
      </ui:link>
    </ui:fill>
  </ui:site-header>
  <main id="top">
    <ui:hero eyebrow="Business print, made well" title="Ideas deserve a little paper." lead="Cards, letterheads and leaflets on beautiful stock, proofed by a person and delivered in two working days.">
      <ui:fill name="actions">
        <ui:link href="#business-cards" variant="button">
          Design your cards
          <ui:icon name="arrow-right" size="sm"/>
        </ui:link>
        <ui:link href="#samples">Request free paper samples</ui:link>
      </ui:fill>
      <ui:fill name="media">
        <ui:media src="/examples/images/business-cards.svg" alt="A stack of black business cards printed with the Paper &amp; Form wordmark"/>
      </ui:fill>
    </ui:hero>
    <ui:section title="Bestsellers">
      <ui:grid columns="4">
        <ui:product-card href="#business-cards" title="Business cards">
          <ui:fill name="media">
            <ui:media src="/examples/images/business-cards.svg" alt=""/>
          </ui:fill>
          <ui:fill name="meta">
            <ui:badge variant="success" t:bind-dot="true">Next day</ui:badge>
          </ui:fill>
          <ui:fill name="price">
            <ui:price amount="£24.00" unit="/ 250"/>
          </ui:fill>
        </ui:product-card>
        <ui:product-card href="#leaflets" title="Folded leaflets">
          <ui:fill name="media">
            <ui:media src="/examples/images/folded-leaflet.svg" alt=""/>
          </ui:fill>
          <ui:fill name="price">
            <ui:price amount="£68.00" unit="/ 500"/>
          </ui:fill>
        </ui:product-card>
        <ui:product-card href="#letterheads" title="Letterheads">
          <ui:fill name="media">
            <ui:media src="/examples/images/letterheads.svg" alt=""/>
          </ui:fill>
          <ui:fill name="meta">
            <ui:badge>FSC paper</ui:badge>
          </ui:fill>
          <ui:fill name="price">
            <ui:price amount="£52.00" unit="/ 500"/>
          </ui:fill>
        </ui:product-card>
        <ui:product-card href="#stickers" title="Round stickers">
          <ui:fill name="media">
            <ui:media src="/examples/images/stickers.svg" alt=""/>
          </ui:fill>
          <ui:fill name="meta">
            <ui:badge variant="primary" t:bind-dot="true">New</ui:badge>
          </ui:fill>
          <ui:fill name="price">
            <ui:price amount="£18.00" unit="/ 100" compareAt="£22.00"/>
          </ui:fill>
        </ui:product-card>
      </ui:grid>
    </ui:section>
    <section class="portal-section" data-tone="muted" aria-labelledby="business-cards-title">
      <div class="portal-section__inner">
        <h2 class="portal-section__title" id="business-cards-title">Business cards</h2>
          <div class="layout-product" id="business-cards">
          <ui:stack>
            <ui:media src="/examples/images/business-cards.svg" alt="Business cards, front and back, on 400gsm matt board" ratio="1/1"/>
            <ui:description-list>
              <ui:description-item term="Size">85 × 55 mm</ui:description-item>
              <ui:description-item term="Printing">Full colour, both sides</ui:description-item>
            </ui:description-list>
          </ui:stack>
          <ui:stack gap="lg">
            <ui:option-cards legend="Paper stock" columns="2">
              <ui:option-card name="stock" value="matt-400" label="400gsm matt" description="Soft, writable finish" aside="Included" t:bind-checked="true"/>
              <ui:option-card name="stock" value="silk-450" label="450gsm silk" description="Smooth, with a gentle sheen" aside="+ £4.00"/>
              <ui:option-card name="stock" value="cotton-600" label="600gsm cotton" description="Thick and tactile" aside="+ £12.00"/>
              <ui:option-card name="stock" value="kraft-350" label="350gsm kraft" description="Back in stock on 20 November" aside="+ £3.00" t:bind-disabled="true"/>
            </ui:option-cards>
            <ui:option-cards legend="Finish" columns="2">
              <ui:option-card name="finish" value="none" label="No finish" t:bind-checked="true"/>
              <ui:option-card name="finish" value="soft-touch" label="Soft-touch laminate" aside="+ £6.00"/>
            </ui:option-cards>
            <ui:quantity-input id="shop-quantity" name="quantity" label="Boxes of 250" t:bind-value="2" t:bind-max="40"/>
          </ui:stack>
          <div class="layout-sticky" data-portal-region="estimate">
            <ui:estimate-panel total="£48.00" delivery="Arrives Thursday 13 November">
              <ui:fill name="status">
                <ui:badge variant="success" t:bind-dot="true">In stock</ui:badge>
              </ui:fill>
              <ui:description-list layout="inline">
                <ui:description-item term="500 cards, 400gsm matt">£42.00</ui:description-item>
                <ui:description-item term="Proof check">Free</ui:description-item>
                <ui:description-item term="Delivery">£6.00</ui:description-item>
              </ui:description-list>
              <ui:fill name="actions">
                <ui:button t:bind-disabled="true">Add to basket</ui:button>
              </ui:fill>
            </ui:estimate-panel>
          </div>
        </div>
      </div>
    </section>
  </main>
  <ui:site-footer>
    <p>Paper &amp; Form · Business print, made well and delivered fast.</p>
    <nav aria-label="Footer">
      <ui:nav-link href="#delivery">Delivery</ui:nav-link>
      <ui:nav-link href="#returns">Returns</ui:nav-link>
      <ui:nav-link href="#contact">Contact</ui:nav-link>
    </nav>
    <ui:fill name="legal">
      <p>Sample layout · Fictional data · Business actions are disabled</p>
    </ui:fill>
  </ui:site-footer>
</div>
```

## Private ordering portal

A signed-in B2B portal: approved items to reorder, a basket summary with an approval step, and the sign-in card visitors see first.

Components: `site-header`, `menu`, `menu-item`, `page-header`, `section`, `basket-line`, `media`, `order-summary`, `description-list`, `card`, `field`, `input`, `button`, `site-footer`.

Use your Portal authentication flow for the sign-in page; never put credentials in query strings or client storage. Scope the reorder list to the signed-in PortalUser's customer and read contract prices on the server. Basket changes and "send for approval" are protected Lua actions; group related writes in the platform transaction capability. The demo has no form or endpoint and every action is disabled. The product illustrations under /examples/images/ exist only in this showcase: replace them with your own asset URLs.

[DataXML source](../examples/layout-ordering-portal.html) · [Rendered example](../rendered/layout-ordering-portal.html)

```xml
<div class="portal-theme portal-layout">
  <ui:site-header>
    <ui:fill name="brand">
      <a href="#top">
        <ui:icon name="layers" size="lg"/>
        Paper &amp; Form for Northwind Clinics
      </a>
    </ui:fill>
    <ui:fill name="nav">
      <ui:nav-link href="#reorder" t:bind-current="true">Reorder</ui:nav-link>
      <ui:nav-link href="#orders">Orders</ui:nav-link>
      <ui:nav-link href="#brand-assets">Brand assets</ui:nav-link>
    </ui:fill>
    <ui:fill name="actions">
      <ui:menu id="account-menu" label="Amira Hassan" triggerVariant="ghost">
        <ui:menu-item href="#profile">
          <ui:icon name="user" size="sm"/>
          Profile
        </ui:menu-item>
        <ui:menu-item href="#addresses">
          <ui:icon name="map-pin" size="sm"/>
          Clinic addresses
        </ui:menu-item>
        <ui:menu-item href="#sign-out">
          <ui:icon name="log-out" size="sm"/>
          Sign out
        </ui:menu-item>
      </ui:menu>
    </ui:fill>
  </ui:site-header>
  <main id="top">
    <ui:container>
      <ui:page-header title="Reorder approved print" description="Every item uses Northwind's approved artwork and contract prices. Orders over £500 go to your practice manager for approval.">
        <ui:fill name="actions">
          <ui:link href="#orders">
            <ui:icon name="package" size="sm"/>
            Order history
          </ui:link>
        </ui:fill>
      </ui:page-header>
    </ui:container>
    <ui:section title="Your clinic's print">
      <div class="layout-split">
        <div>
          <ui:basket-line title="Appointment cards" detail="85 × 55 mm, 400gsm matt · Last ordered 14 October" quantity="Usually 1,000" total="£38.00">
            <ui:fill name="media">
              <ui:media src="/examples/images/business-cards.svg" alt="" ratio="1/1"/>
            </ui:fill>
            <ui:fill name="actions">
              <ui:button variant="secondary" size="sm" t:bind-disabled="true">
                <ui:icon name="plus" size="sm"/>
                Add to basket
              </ui:button>
            </ui:fill>
          </ui:basket-line>
          <ui:basket-line title="Clinic letterheads" detail="A4, 120gsm uncoated · Last ordered 2 September" quantity="Usually 2,500" total="£96.00">
            <ui:fill name="media">
              <ui:media src="/examples/images/letterheads.svg" alt="" ratio="1/1"/>
            </ui:fill>
            <ui:fill name="actions">
              <ui:button variant="secondary" size="sm" t:bind-disabled="true">
                <ui:icon name="plus" size="sm"/>
                Add to basket
              </ui:button>
            </ui:fill>
          </ui:basket-line>
          <ui:basket-line title="Aftercare leaflets" detail="A5 folded to A6, 170gsm silk · Last ordered 30 July" quantity="Usually 500" total="£64.00">
            <ui:fill name="media">
              <ui:media src="/examples/images/folded-leaflet.svg" alt="" ratio="1/1"/>
            </ui:fill>
            <ui:fill name="actions">
              <ui:button variant="secondary" size="sm" t:bind-disabled="true">
                <ui:icon name="plus" size="sm"/>
                Add to basket
              </ui:button>
            </ui:fill>
          </ui:basket-line>
        </div>
        <div class="layout-sticky">
          <ui:order-summary title="Basket" total="£165.60">
            <ui:basket-line title="Appointment cards" quantity="1,000 cards" total="£38.00"/>
            <ui:basket-line title="Clinic letterheads" quantity="2,500 sheets" total="£96.00"/>
            <ui:description-list layout="inline">
              <ui:description-item term="Delivery to Leeds clinic">£4.00</ui:description-item>
              <ui:description-item term="VAT (20%)">£27.60</ui:description-item>
            </ui:description-list>
            <ui:fill name="actions">
              <ui:button t:bind-disabled="true">Send for approval</ui:button>
              <ui:link href="#basket">Edit basket</ui:link>
            </ui:fill>
          </ui:order-summary>
        </div>
      </div>
    </ui:section>
    <ui:section title="The sign-in page" tone="muted">
      <div class="layout-narrow">
        <p>Signed-out visitors see only this card. Accounts are created by Northwind's practice managers.</p>
        <ui:card>
          <ui:fill name="header">
            <h3>Sign in to Northwind Clinics</h3>
          </ui:fill>
          <ui:stack>
            <ui:field for="portal-email" label="Work email">
              <ui:input id="portal-email" name="email" type="email" autocomplete="email" placeholder="amira@northwind.example"/>
            </ui:field>
            <ui:field for="portal-password" label="Password">
              <ui:input id="portal-password" name="password" type="password" autocomplete="current-password"/>
            </ui:field>
            <ui:button t:bind-disabled="true">Sign in</ui:button>
          </ui:stack>
          <ui:fill name="footer">
            <p>
              New to the portal?
              <ui:link href="#request-access">Ask your practice manager for access</ui:link>
            </p>
          </ui:fill>
        </ui:card>
      </div>
    </ui:section>
  </main>
  <ui:site-footer>
    <p>A private ordering portal by Paper &amp; Form for Northwind Clinics.</p>
    <nav aria-label="Footer">
      <ui:nav-link href="#help">Help</ui:nav-link>
      <ui:nav-link href="#contract">Contract prices</ui:nav-link>
    </nav>
    <ui:fill name="legal">
      <p>Sample layout · Fictional data · Business actions are disabled</p>
    </ui:fill>
  </ui:site-footer>
</div>
```

## Job tracking

An order page with a production timeline, order details, downloadable documents and a list of recent orders with status badges.

Components: `site-header`, `avatar`, `page-header`, `breadcrumbs`, `card`, `timeline`, `timeline-step`, `description-list`, `stat`, `file-list`, `file-item`, `alert`, `table`, `badge`, `site-footer`.

Fetch the order through an authorised Lua read handler scoped to the current PortalUser and customer membership; an order reference is an identifier, not permission to view it. Map production events to timeline steps on the server. Serve documents through an authorised route or Folder binding. Tracking, totals and files here are fictional.

[DataXML source](../examples/layout-tracking.html) · [Rendered example](../rendered/layout-tracking.html)

```xml
<div class="portal-theme portal-layout">
  <ui:site-header>
    <ui:fill name="brand">
      <a href="#top">
        <ui:icon name="layers" size="lg"/>
        Paper &amp; Form
      </a>
    </ui:fill>
    <ui:fill name="nav">
      <ui:nav-link href="#shop">Shop</ui:nav-link>
      <ui:nav-link href="#orders" t:bind-current="true">Orders</ui:nav-link>
      <ui:nav-link href="#help">Help</ui:nav-link>
    </ui:fill>
    <ui:fill name="actions">
      <ui:avatar name="Amira Hassan" initials="AH" size="sm"/>
    </ui:fill>
  </ui:site-header>
  <main id="top">
    <ui:container>
      <ui:page-header title="Order PF-1042" description="Placed on Monday 3 November by Amira Hassan. Your proof is approved and the cards are on press.">
        <ui:fill name="breadcrumbs">
          <ui:breadcrumbs>
            <li>
              <a href="#orders">Orders</a>
            </li>
            <li>
              <span aria-current="page">PF-1042</span>
            </li>
          </ui:breadcrumbs>
        </ui:fill>
        <ui:fill name="actions">
          <ui:link href="#invoice-pf-1042">
            <ui:icon name="receipt" size="sm"/>
            Invoice
          </ui:link>
          <ui:button variant="secondary" t:bind-disabled="true">Reorder</ui:button>
        </ui:fill>
      </ui:page-header>
      <div class="layout-body">
        <div class="layout-split">
          <ui:stack gap="lg">
            <ui:card>
              <ui:fill name="header">
                <h2>Progress</h2>
              </ui:fill>
              <ui:timeline label="Order PF-1042 progress">
                <ui:timeline-step title="Order received" state="done" time="Mon 09:12"/>
                <ui:timeline-step title="Proof approved" state="done" time="Mon 14:40">
                  Approved by Amira Hassan.
                </ui:timeline-step>
                <ui:timeline-step title="Printing" state="current" time="Today">
                  On press 2, 400gsm matt with soft-touch laminate.
                </ui:timeline-step>
                <ui:timeline-step title="Dispatched" time="Est. Wed"/>
                <ui:timeline-step title="Delivered" time="Est. Thu 13 Nov"/>
              </ui:timeline>
            </ui:card>
            <ui:card>
              <ui:fill name="header">
                <h2>Details</h2>
              </ui:fill>
              <ui:description-list>
                <ui:description-item term="Product">Business cards, 85 × 55 mm</ui:description-item>
                <ui:description-item term="Quantity">500 cards</ui:description-item>
                <ui:description-item term="Paper">400gsm matt, soft-touch laminate</ui:description-item>
                <ui:description-item term="Delivery">Courier, tracked</ui:description-item>
                <ui:description-item term="Deliver to">Amira Hassan, 1 Example Lane, Papertown PT1 1AA</ui:description-item>
                <ui:description-item term="Total">£58.80 including VAT</ui:description-item>
              </ui:description-list>
            </ui:card>
          </ui:stack>
          <ui:stack gap="lg">
            <ui:stat label="Estimated delivery" value="Thu 13 Nov" change="On schedule" trend="flat"/>
            <ui:card>
              <ui:fill name="header">
                <h2>Documents</h2>
              </ui:fill>
              <ui:file-list>
                <ui:file-item href="#invoice-pf-1042" name="Invoice PF-1042.pdf" type="PDF" size="84 KB"/>
                <ui:file-item href="#proof-pf-1042" name="Approved proof, version 3.pdf" type="PDF" size="2.4 MB"/>
              </ui:file-list>
            </ui:card>
            <ui:alert>
              <ui:fill name="title">Need to change something?</ui:fill>
              <p>Printing has started, so changes now need a reprint. Call the studio on 0161 496 0000.</p>
            </ui:alert>
          </ui:stack>
        </div>
        <ui:table caption="Recent orders">
          <ui:fill name="head">
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Placed</th>
              <th scope="col">Product</th>
              <th scope="col">Status</th>
              <th scope="col">Total</th>
            </tr>
          </ui:fill>
          <tr>
            <td>
              <ui:link href="#pf-1042">PF-1042</ui:link>
            </td>
            <td>3 Nov</td>
            <td>Business cards</td>
            <td>
              <ui:badge variant="warning" t:bind-dot="true">In production</ui:badge>
            </td>
            <td>£58.80</td>
          </tr>
          <tr>
            <td>
              <ui:link href="#pf-1038">PF-1038</ui:link>
            </td>
            <td>28 Oct</td>
            <td>Folded leaflets</td>
            <td>
              <ui:badge variant="primary" t:bind-dot="true">Awaiting proof</ui:badge>
            </td>
            <td>£81.60</td>
          </tr>
          <tr>
            <td>
              <ui:link href="#pf-1021">PF-1021</ui:link>
            </td>
            <td>12 Oct</td>
            <td>Letterheads</td>
            <td>
              <ui:badge variant="success" t:bind-dot="true">Delivered</ui:badge>
            </td>
            <td>£62.40</td>
          </tr>
        </ui:table>
      </div>
    </ui:container>
  </main>
  <ui:site-footer>
    <p>Paper &amp; Form · Business print, made well and delivered fast.</p>
    <nav aria-label="Footer">
      <ui:nav-link href="#delivery">Delivery</ui:nav-link>
      <ui:nav-link href="#contact">Contact</ui:nav-link>
    </nav>
    <ui:fill name="legal">
      <p>Sample layout · Fictional data · Business actions are disabled</p>
    </ui:fill>
  </ui:site-footer>
</div>
```

## API reference

Developer documentation: endpoints with parameter tables, copyable code samples in tabs and a masked API key with a copy button.

Components: `site-header`, `page-header`, `breadcrumbs`, `code-block`, `endpoint`, `property-table`, `tabs`, `tab-panel`, `card`, `key-display`, `kbd`, `site-footer`.

Generate endpoints and property tables from your API description in Lua and pass tabs from loader data. Render key-display only on authorised, uncached pages, mask the key on the server and pass the full value only to the signed-in owner; prefer showing a new secret once. Copy buttons and tabs need the Portal runtime; without it every sample still shows. The key here is fictional.

[DataXML source](../examples/layout-api.html) · [Rendered example](../rendered/layout-api.html)

```xml
<div class="portal-theme portal-layout">
  <ui:site-header>
    <ui:fill name="brand">
      <a href="#top">
        <ui:icon name="layers" size="lg"/>
        Paper &amp; Form Developers
      </a>
    </ui:fill>
    <ui:fill name="nav">
      <ui:nav-link href="#guides">Guides</ui:nav-link>
      <ui:nav-link href="#reference" t:bind-current="true">API reference</ui:nav-link>
      <ui:nav-link href="#changelog">Changelog</ui:nav-link>
    </ui:fill>
    <ui:fill name="actions">
      <ui:link href="#dashboard" variant="button">
        Dashboard
        <ui:icon name="arrow-up-right" size="sm"/>
      </ui:link>
    </ui:fill>
  </ui:site-header>
  <main id="top">
    <ui:container>
      <ui:page-header title="Orders API" description="Place, track and reorder print from your own systems. Every request is authenticated with a secret key and returns JSON.">
        <ui:fill name="breadcrumbs">
          <ui:breadcrumbs>
            <li>
              <a href="#reference">API reference</a>
            </li>
            <li>
              <span aria-current="page">Orders</span>
            </li>
          </ui:breadcrumbs>
        </ui:fill>
        <ui:fill name="actions">
          <ui:link href="#openapi">
            <ui:icon name="download" size="sm"/>
            OpenAPI document
          </ui:link>
        </ui:fill>
      </ui:page-header>
      <div class="layout-split">
        <div class="layout-body">
          <section aria-labelledby="authentication">
            <h2 id="authentication">Authentication</h2>
            <p>Send your secret key as a bearer token and keep it on your server. Test keys never print or charge.</p>
            <ui:code-block language="Shell">curl https://print.example/v1/orders \
  -H "Authorization: Bearer $PAPER_AND_FORM_KEY"</ui:code-block>
          </section>
          <section aria-labelledby="endpoints">
            <h2 id="endpoints">Endpoints</h2>
            <ui:endpoint method="GET" path="/v1/orders/{reference}" summary="Retrieve one order with its line items and production status.">
              <ui:property-table caption="Path parameters">
                <tr>
                  <td>
                    <code>reference</code>
                  </td>
                  <td>string</td>
                  <td>Yes</td>
                  <td>The order reference, for example PF-1042.</td>
                </tr>
              </ui:property-table>
            </ui:endpoint>
            <ui:endpoint method="POST" path="/v1/orders" summary="Place an order from an accepted estimate.">
              <ui:property-table caption="Body fields">
                <tr>
                  <td>
                    <code>estimate</code>
                  </td>
                  <td>string</td>
                  <td>Yes</td>
                  <td>The estimate to accept. Prices are fixed when it was issued.</td>
                </tr>
                <tr>
                  <td>
                    <code>deliveryNote</code>
                  </td>
                  <td>string or null</td>
                  <td>No</td>
                  <td>Instructions for the courier.</td>
                </tr>
              </ui:property-table>
            </ui:endpoint>
            <ui:endpoint method="DELETE" path="/v1/orders/{reference}" summary="Cancel an order before its proof is approved."/>
          </section>
          <section aria-labelledby="examples">
            <h2 id="examples">Examples</h2>
            <ui:tabs label="Example language" t:bind-tabs="input.tabs">
              <ui:tab-panel id="example-shell" title="Shell">
                <ui:code-block language="Shell">curl https://print.example/v1/orders/PF-1042 \
  -H "Authorization: Bearer $PAPER_AND_FORM_KEY"</ui:code-block>
              </ui:tab-panel>
              <ui:tab-panel id="example-javascript" title="JavaScript">
                <ui:code-block language="JavaScript">const response = await fetch("https://print.example/v1/orders/PF-1042", {
  headers: { Authorization: `Bearer ${process.env.PAPER_AND_FORM_KEY}` },
});
const order = await response.json();</ui:code-block>
              </ui:tab-panel>
              <ui:tab-panel id="example-response" title="Response">
                <ui:code-block language="JSON">{
  "reference": "PF-1042",
  "status": "printing",
  "total": "58.80",
  "currency": "GBP"
}</ui:code-block>
              </ui:tab-panel>
            </ui:tabs>
          </section>
        </div>
        <div class="layout-sticky">
          <ui:card>
            <ui:fill name="header">
              <h2>Your keys</h2>
            </ui:fill>
            <ui:stack>
              <ui:key-display label="Test key" value="pf_test_4Rk8Wm2QxN7cTb5Lp9Hs1Vd6" masked="pf_test_••••1Vd6"/>
              <p>
                Rotate keys from the dashboard. Press
                <ui:kbd>Ctrl</ui:kbd>
                +
                <ui:kbd>K</ui:kbd>
                to search the reference.
              </p>
            </ui:stack>
          </ui:card>
        </div>
      </div>
    </ui:container>
  </main>
  <ui:site-footer>
    <p>Paper &amp; Form Developers · Version 2026-11-01</p>
    <nav aria-label="Footer">
      <ui:nav-link href="#status">API status</ui:nav-link>
      <ui:nav-link href="#support">Support</ui:nav-link>
    </nav>
    <ui:fill name="legal">
      <p>Sample layout · Fictional data · Business actions are disabled</p>
    </ui:fill>
  </ui:site-footer>
</div>
```
