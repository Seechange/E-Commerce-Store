import { create } from "zustand"
import toast from "react-hot-toast"
import axiosInstance from "../lib/axios"

export const useCartStore = create((set, get) => ({
    cart: [],
    coupon: null,
    total: 0,
    subTotal: 0,
    isCouponApplie: false,
    getMyCoupon: async () => {
        try {
            const response = await axiosInstance.get("/coupons");
            set({ coupon: response.data });
            console.log('check coupon:', response.data)
        } catch (error) {
            console.error("Error fetching coupon:", error);
        }
    },
    applyCoupon: async (code) => {
        try {
            const response = await axiosInstance.post("/coupons/validate", { code });
            set({ coupon: response.data, isCouponApplied: true });
            get().calculateTotals();
            toast.success("Coupon applied successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to apply coupon");
        }
    },
    removeCoupon: () => {
        set({ coupon: null, isCouponApplied: false });
        get().calculateTotals();
        toast.success("Coupon removed");
    },
    getCartItem: async () => {
        try {
            const res = await axiosInstance.get("/cart")
            set({ cart: res.data })
            get().calculateTotals();

        } catch (error) {
            set({ cart: [] })
            toast.error(error.response.data.message)
        }
    },

    removeFromCart: async (productId) => {
        await axiosInstance.delete("/cart", { data: { productId } });
        set((prevState) => ({ cart: prevState.cart.filter((item) => item._id !== productId) }));
        get().calculateTotals();
    },

    updateQuantity: async (productId, quantity) => {
        if (quantity === 0) {
            get().removeFromCart(productId);
            return;
        }

        await axiosInstance.put(`/cart/${productId}`, { quantity });
        set((prevState) => ({
            cart: prevState.cart.map((item) => (item._id === productId ? { ...item, quantity } : item)),
        }));
        get().calculateTotals();
    },

    addToCart: async (product) => {
        try {
            await axiosInstance.post("/cart", { productId: product._id })
            toast.success("Product added to cart");
            set((prevState) => {
                const cart = Array.isArray(prevState.cart) ? prevState.cart : []; // ✅ Đảm bảo cart luôn là mảng
                const existingItem = cart.find((item) => item._id === product._id);

                const newCart = existingItem
                    ? cart.map((item) =>
                        item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                    )
                    : [...cart, { ...product, quantity: 1 }];

                return { cart: newCart };
            });

            get().calculateTotals()
        } catch (error) {
            toast.error(error.response.data.message)

        }
    },
    clearCart: async () => {
        set({ cart: [], coupon: null, total: 0, subtotal: 0 });
    },
    calculateTotals: () => {
        const { cart, coupon } = get();
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let total = subtotal;

        if (coupon) {
            const discount = subtotal * (coupon.discount / 100);
            total = subtotal - discount;
        }

        set({ subtotal, total });
    },
}))