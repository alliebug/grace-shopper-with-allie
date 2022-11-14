import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { fetchCart } from '../store/cart';

class Cart extends React.Component {
  constructor() {
    super();
    this.state = {
      loading: true,
    };
  }

  async componentDidMount() {
    const { orderId } = this.props.match.params;
    await this.props.getCart(orderId);
    this.setState({ loading: false });
  }

  render() {
    const { cart } = this.props;
    const { loading } = this.state;

    if (loading) {
      return (
        <main>
          <p>Loading cart details...</p>
        </main>
      );
    } else {
      const hasCart = cart.length !== 0;
      let cartPrice = 0;

      return (
        <main>
          {hasCart ? (
            <div className="cart-layout">
              <div className="cart-products">
                {cart.map((op) => {
                  cartPrice += parseInt(op.item_total_price, 10);

                  return (
                    <div key={op.product.id} className="cart-product-layout">
                      <Link to={`/shop/products/${op.product.id}`}>
                        <img
                          className="all-products-img"
                          src={op.product.imageUrl}
                        />
                      </Link>
                      <div className="product-detail">
                        <p>{op.product.name}</p>
                        <p>Number of items: {op.num_items}</p>
                        <p>
                          Total price from this product: ${op.item_total_price}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p>Your checkout total is: ${cartPrice}</p>
              <button className="checkout-button">CHECKOUT</button>
            </div>
          ) : (
            <h1>Your cart is empty.</h1>
          )}
        </main>
      );
    }
  }
}

const mapState = (state) => {
  return {
    cart: state.cart,
  };
};

const mapDispatch = (dispatch) => {
  return {
    getCart: (orderId) => dispatch(fetchCart(orderId)),
  };
};

export default connect(mapState, mapDispatch)(Cart);
