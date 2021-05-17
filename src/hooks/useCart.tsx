import { useEffect } from "react";
import { useRef } from "react";
import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    // Buscando no localStorage
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      // Transfomar o string em array
      return JSON.parse(storagedCart);
    }

    return [];
  });

  // tipagem generica
  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  // se o primeiro valor for falsy retorna cart. se não retorna o pervCartRef
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      // criando um array a partir do valor que tem no cart
      // Sem mexer no cart e respeitando a imutabilidade
      const updateCart = [...cart];
      // verificar se o produto ja existe
      const productExists = updateCart.find(
        (product) => product.id === productId
      );
      // Verificar o estoque a quantidade de unidades de cada item:
      // Pegar na api o item
      const stock = await api.get(`/stock/${productId}`);
      // Pegar a quantidade do item no stock
      const stockAmount = stock.data.amount;
      // Quantidade atual se existir. Se exitir mostra a quantidade, se não é 0.
      const currentAmount = productExists ? productExists.amount : 0;
      // Defini a quantidade
      const amount = currentAmount + 1;
      // Se a quantidade do amount for maior que a quantidade do estoque precisa falhar, se falhar para tudo
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      // Verificar se o produto existe atualizar a quantidade de produto
      if (productExists) {
        productExists.amount = amount;
      } else {
        // Se for um produto novo, busco o produto na api
        // criar o campo amount 1 pois é o primeiro
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        // Perpertuar no updateCart
        updateCart.push(newProduct);
      }
      // Salvar no state cart
      setCart(updateCart);
      // Salvar no localStorage, precisa transformar numa string
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // pegar o carrinho e add na variavel updateCart
      const updatedCart = [...cart];
      // pegar o item por id
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );
      // se produtoIndex for maior ou igual que 0
      if (productIndex >= 0) {
        // apaga um produto, atualiza o cart e salva no localStorage
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);
      } else {
        // se não encontrar o item no carrinho força o erro e vai pro catch
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      // Se o produto for menor ou igual a 0 já sai daqui, pois não tem nada para atualizar
      if (amount <= 0) {
        return;
      }
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );
      if (productExists) {
        productExists.amount = amount;
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
