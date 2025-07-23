import {
  Cart,
  ChildProduct,
  InteractiveProduct as HeadlessInteractiveProduct,
  Product,
} from "@coveo/headless/commerce";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useConfig } from "../../context/config-context.js";
import { saveCartItemsToLocaleStorage } from "../../utils/cart-utils.js";
import { formatCurrency } from "../../utils/format-currency.js";
import "./interactive-product.css";

interface IInteractiveProductProps {
  product: Product;
  controller: HeadlessInteractiveProduct;
  cartController: Cart;
  promoteChildToParent: (product: ChildProduct) => void;
  navigate: (pathName: string) => void;
}

export default function InteractiveProduct(props: IInteractiveProductProps) {
  const {
    product,
    controller,
    cartController,
    promoteChildToParent,
    navigate,
  } = props;

  const [cartState, setCartState] = useState(cartController.state);
  const [showDetails, setShowDetails] = useState(false);

  // When the cart state changes, you should save it so that you can restore it when you initialize the commerce engine.
  useEffect(() => {
    cartController.subscribe(() => {
      setCartState(cartController.state);
      saveCartItemsToLocaleStorage(cartController.state);
    });
  }, [cartController]);

  const isInCart = () => {
    return cartState.items.some(
      (item) => item.productId === product.ec_product_id
    );
  };

  const numberInCart = () => {
    return (
      cartState.items.find((item) => item.productId === product.ec_product_id)
        ?.quantity ?? 0
    );
  };

  const adjustQuantity = (delta: number) => {
    cartController.updateItemQuantity({
      name: product.ec_name ?? product.permanentid,
      price: product.ec_promo_price ?? product.ec_price ?? NaN,
      productId: product.ec_product_id ?? product.permanentid,
      quantity: numberInCart() + delta,
    });
  };

  const removeFromCart = () => {
    cartController.updateItemQuantity({
      name: product.ec_name ?? product.permanentid,
      price: product.ec_promo_price ?? product.ec_price ?? NaN,
      productId: product.ec_product_id ?? product.permanentid,
      quantity: 0,
    });
  };

  const renderProductCartControls = () => {
    return (
      <div className="ProductCartControls">
        <p className="CartCurrentQuantity">
          Currently in cart:<span> {numberInCart()}</span>
        </p>
        <button className="CartAddOne" onClick={() => adjustQuantity(1)}>
          Add one
        </button>
        <button
          className="CartRemoveOne"
          disabled={!isInCart()}
          onClick={() => adjustQuantity(-1)}
        >
          Remove one
        </button>
        <button
          className="CartRemoveAll"
          disabled={!isInCart()}
          onClick={removeFromCart}
        >
          Remove all
        </button>
      </div>
    );
  };

  const renderProductPrice = () => {
    const promoPrice = product.ec_promo_price;
    const price = product.ec_price;

    if (promoPrice && price && promoPrice < price) {
      return (
        <span className="InteractiveProductPrice">
          <s>{formatCurrency(price)}</s>
          <span> {formatCurrency(promoPrice)}</span>
        </span>
      );
    }

    if (price || promoPrice) {
      return <span>{formatCurrency((price ?? promoPrice)!)}</span>;
    }

    return <span>Price not available</span>;
  };

  const clickProduct = () => {
    controller.select();

    // Normally here, you would simply navigate to product.clickUri.
    const productId = product.ec_product_id ?? product.permanentid;
    const productName = product.ec_name ?? product.permanentid;
    const productPrice = product.ec_promo_price ?? product.ec_price ?? NaN;
    //navigate(`/product/${productId}/${productName}/${productPrice}`);
    window.open(product.clickUri, "_blank");
    // In this sample project, we navigate to a custom URL because the app doesn't have access to a commerce backend
    // service to retrieve detailed product information from for the purpose of rendering a product description page
    // (PDP).
    // Therefore, we encode bare-minimum product information in the URL, and use it to render the PDP.
    // This is by no means a realistic scenario.
  };

  // Helper to flatten product fields
  function flattenFields(obj: any, prefix = ""): Record<string, any> {
    let result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const fieldKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          Object.assign(result, flattenFields(value, fieldKey));
        } else {
          result[fieldKey] = value;
        }
      }
    }
    return result;
  }

  const detailsModal = showDetails
    ? ReactDOM.createPortal(
        <div className="InteractiveProductModalOverlay">
          <div className="InteractiveProductModalContent">
            <button
              className="InteractiveProductModalClose"
              onClick={() => setShowDetails(false)}
            >
              Close
            </button>
            <h2>Product Details</h2>
            <table className="InteractiveProductModalTable">
              <tbody>
                {Object.entries(flattenFields(product as any)).map(
                  ([key, value]) => (
                    <tr key={key}>
                      <td className="InteractiveProductModalKey">{key}</td>
                      <td className="InteractiveProductModalValue">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="InteractiveProduct">
      <div className="product-metadata">
        <span className="product-id">
          {product.ec_product_id?.toLocaleUpperCase()}
        </span>
        <div className="product-rating">
          <span className="rating-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className={`star ${
                  i < Math.floor(product.ec_rating || 0) ? "filled" : ""
                }`}
              >
                ★
              </span>
            ))}
          </span>
          <span className="rating-value">{product.ec_rating?.toFixed(1)}</span>
        </div>
      </div>
      <div
        className="ProductImageWrapper"
        onClick={clickProduct}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") clickProduct();
        }}
      >
        {product.ec_images && product.ec_images.length > 0 ? (
          <img
            src={`${product.ec_images[0]}?&wid=309&hei=309&$jpglarge$`}
            alt={product.ec_name || product.permanentid}
          />
        ) : (
          <div>No image available</div>
        )}
        <div className="image-overlay">
          <span
            className="view-details"
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(true);
            }}
          >
            View Details
          </span>
        </div>
      </div>
      <a
        target="_blank"
        href={product.clickUri}
        className="ProductLink"
        onClick={(e) => {
          e.preventDefault();
          clickProduct();
        }}
      >
        {product.ec_name}
      </a>
      {renderProductPrice()}
      <div className="ProductDescription">
        <p>{product.ec_description}</p>
      </div>
      {product.totalNumberOfChildren! > 1 && (
        <div className="product-variants">
          <p className="variants-title">Also available in:</p>
          <div className="variants-container">
            {product.children.map((child) => {
              return child.permanentid !== product.permanentid ? (
                <button
                  key={child.permanentid}
                  className="variant-button"
                  onClick={() => promoteChildToParent!(child)}
                >
                  <img
                    height="25px"
                    title={child?.additionalFields?.ps_variation_label || ""}
                    src={
                      child?.additionalFields?.ps_variation_image ||
                      child.ec_images[0]
                    }
                  ></img>
                </button>
              ) : null;
            })}
            {product.totalNumberOfChildren! > 5 && (
              <span className="more-variants">
                {" "}
                +{product.totalNumberOfChildren! - 5} more
              </span>
            )}
          </div>
        </div>
      )}
      {/* {renderProductCartControls()} */}
      <hr />
      {detailsModal}
    </div>
  );
}
