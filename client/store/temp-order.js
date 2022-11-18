import axios from 'axios';

const TOKEN = 'token';
const ORDER = 'order';

const CREATE_ORDER = 'CREATE_ORDER';
const GET_ORDER = 'GET_ORDER';
const FULFILL_ORDER = 'FULFILL_ORDER';
const SET_USER_ORDER = 'SET_USER_ORDER';

const _createOrder = (order) => ({ type: CREATE_ORDER, order });
export const _getOrder = (order) => ({ type: GET_ORDER, order });
const _fulfillOrder = (order) => ({ type: FULFILL_ORDER, order });
const _setUserOrder = (order) => ({ type: SET_USER_ORDER, order });
// createOrder()
export const createOrder = (setUserId) => {
  return async (dispatch) => {
    try {
      const userToken = window.localStorage.getItem(TOKEN);

      // if userToken exists, need to send it on the request header
      if (userToken) {
        // NOTE: need to change tempCart to order later
        const { data: order } = await axios.post(
          `/api/tempCart`,
          {
            fulfilled: false,
            setUserId,
          },
          {
            headers: {
              authorization: userToken,
            },
          }
        );

        window.localStorage.setItem(ORDER, JSON.stringify(order));
        dispatch(_createOrder(order));
      } else {
        // NOTE: need to change tempCart to order later
        const { data: order } = await axios.post(`/api/tempCart`, {
          fulfilled: false,
          setUserId,
        });

        window.localStorage.setItem(ORDER, JSON.stringify(order));
        dispatch(_createOrder(order));
      }
    } catch (error) {
      console.log('store/temp-order createOrder ERROR: ', error);
      throw error;
    }
  };
};

export const getOrder = (orderId) => {
  return async (dispatch) => {
    try {
      // NOTE: need to change tempCart to order later
      // console.log('Here is temp-order getOrder()');
      const { data: order } = await axios.get(`/api/tempCart/${orderId}`);
      // console.log('getOrder thunk: order =', order);
      dispatch(_getOrder(order));
    } catch (error) {
      console.log('store/temp-order getOrder ERROR: ', error);
      throw error;
    }
  };
};

export const fullfillOrder = (order) => {
  return async (dispatch) => {
    try {
      const { data: updated } = await axios.put(`/api/cart/${order.id}`, {
        ...order,
        fulfilled: true,
      });
      window.localStorage.clear();
      dispatch(_fulfillOrder(updated));
    } catch (error) {
      console.log('store/temp-order fullfillOrder ERROR', error);
    }
  };
};
export const updateOrder = (orderId, requiredUpdate) => {
  return async (dispatch) => {
    try {
      const userToken = window.localStorage.getItem(TOKEN);
      if (userToken) {
        console.log('Here is temp-order updateOrder()');

        // NOTE: need to change tempCart to order later
        const { data: order } = await axios.put(
          `/api/tempCart/${orderId}`,
          requiredUpdate,
          {
            headers: {
              authorization: userToken,
            },
          }
        );
        console.log('updateOrder thunk: order =', order);
        dispatch(_setUserOrder(order));
      }
    } catch (error) {
      console.log('store/temp-order updateOrder ERROR: ', error);
      throw error;
    }
  };
};

export const getOrderByUser = () => {
  return async (dispatch) => {
    try {
      const userToken = window.localStorage.getItem(TOKEN);
      console.log(
        'temp-order thunk -- in getOrderByUser. userToken: ',
        userToken
      );

      // if token exists for user
      if (userToken) {
        // NOTE: need to change tempCart to order later
        const { data } = await axios.get('/api/tempCart', {
          headers: {
            authorization: userToken,
          },
        });

        // if user does not have an unfulfilled order in database
        if (!data.id) {
          // then check local storage for any existing order
          const orderInLocalStorage = JSON.parse(
            window.localStorage.getItem(ORDER)
          );

          // if order exists in local storage, dispatch thunk to set userId on this existing order
          if (orderInLocalStorage) {
            dispatch(updateOrder(orderInLocalStorage.id, { setUser: true }));
          } else {
            // if no order in local storage as well, then create order
            dispatch(createOrder(true));
          }
        } else {
          // else user ALREADY HAS an unfulfilled order in database
          console.log('user has an unfulfilled order in the database');

          // check local storage for any existing order / items in cart
          const orderInLocalStorage = JSON.parse(
            window.localStorage.getItem(ORDER)
          );

          console.log('data.id ', data.id);
          console.log('>>>> orderInLocalStorage ', orderInLocalStorage);

          // there is no order in the local storage yet, use the order in database
          if (!orderInLocalStorage) {
            window.localStorage.setItem(ORDER, JSON.stringify(data));
            dispatch(_setUserOrder(data));
          } else if (data.id !== orderInLocalStorage.id) {
            // if unfulfilled order id does not match the order id in local storage

            // get items (if any) in the local storage's order
            const { data: localCart } = await axios.get(
              `/api/cart/${orderInLocalStorage.id}`
            );

            // get items (if any) in the existing order in database
            const { data: dbCart } = await axios.get(`/api/cart/${data.id}`);

            // if no orders are started as guest, continue using the order that is already in database
            if (dbCart.length >= 0 && localCart.length === 0) {
              console.log('no orders are started as guest');
              window.localStorage.setItem(ORDER, JSON.stringify(data));
              dispatch(_setUserOrder(data));
            } else if (dbCart.length === 0 && localCart.length > 0) {
              console.log(
                'for each item in localCart, update the orderId to the data.id'
              );
              // for each of the item in localCart, update the orderId to the data.id
              localCart.forEach(async (item) => {
                await axios.put(
                  `/api/tempCart/${data.id}`,
                  {
                    localCartId: orderInLocalStorage.id,
                    productId: item.productId,
                  },
                  {
                    headers: {
                      authorization: userToken,
                    },
                  }
                );
              });

              window.localStorage.setItem(ORDER, JSON.stringify(data));
              dispatch(_setUserOrder(data));
            } else if (dbCart.length > 0 && localCart.length > 0) {
              // user has two carts of items, need to consolidate

              const newItems = localCart.filter((item) => {
                return !dbCart.some(
                  (dbCartItem) => item.productId === dbCartItem.productId
                );
              });
              console.log('newItems: ', newItems);

              // change the orderId on these newItems to the existing order's ID
              newItems.forEach(async (item) => {
                await axios.put(
                  `/api/tempCart/${data.id}`,
                  {
                    localCartId: orderInLocalStorage.id,
                    productId: item.productId,
                  },
                  {
                    headers: {
                      authorization: userToken,
                    },
                  }
                );
              });

              const itemsToConsolidate = localCart.filter((item) => {
                return dbCart.some(
                  (dbCartItem) => item.productId === dbCartItem.productId
                );
              });
              console.log('items to consolidate: ', itemsToConsolidate);

              itemsToConsolidate.forEach(async (item) => {
                await axios.put(
                  `/api/tempCart/${data.id}`,
                  {
                    consolidate: true,
                    localCartId: orderInLocalStorage.id,
                    productId: item.productId,
                  },
                  {
                    headers: {
                      authorization: userToken,
                    },
                  }
                );
              });

              window.localStorage.setItem(ORDER, JSON.stringify(data));
              dispatch(_setUserOrder(data));
            }
          } else {
            // else set user's order to their unfulfilled order that is existing in database
            console.log(
              'continue using order -- db cart and local cart is same'
            );
            console.log('check data.id ', data.id);
            console.log('check orderInLocalStorage ', orderInLocalStorage);

            window.localStorage.setItem(ORDER, JSON.stringify(data));
            dispatch(_setUserOrder(data));
          }
        }
      }
    } catch (error) {
      console.log('store/temp-order getOrderByUser ERROR: ', error);
      throw error;
    }
  };
};

const initialState = {};

export default function tempOrderReducer(state = initialState, action) {
  switch (action.type) {
    case CREATE_ORDER:
      return action.order;
    case GET_ORDER:
      return action.order;
    case FULFILL_ORDER:
      return {};
    case SET_USER_ORDER:
      return action.order;
    default:
      return state;
  }
}
