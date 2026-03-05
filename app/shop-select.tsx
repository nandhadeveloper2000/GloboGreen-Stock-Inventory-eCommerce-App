import  { useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./context/auth/AuthProvider";
import { useShop } from "./context/shop/ShopProvider";

export default function ShopSelect() {
  const router = useRouter();
  const { user, token, loading, isShopOwner, isManager, isEmployee } = useAuth();
  const { setCurrentShopId } = useShop();

  useEffect(() => {
    if (!loading && !token) router.replace("/Login" as any);
  }, [loading, token]);

  const shops = user?.shopIds || [];

  const goNext = async (shopId: string) => {
    await setCurrentShopId(shopId);

    if (isShopOwner) router.replace("/shopowner" as any);
    else if (isManager) router.replace("/manager" as any);
    else if (isEmployee) router.replace("/employee" as any);
    else router.replace("/Login" as any);
  };

  if (!shops.length) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-bold">No shops assigned</Text>
        <Text className="text-gray-500 mt-2 text-center">
          Contact admin to assign shops.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-6 pt-10">
      <Text className="text-2xl font-extrabold">Select Shop</Text>
      <Text className="text-gray-500 mt-1">Choose which shop you want to manage.</Text>

      <FlatList
        className="mt-6"
        data={shops}
        keyExtractor={(id) => String(id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => goNext(String(item))}
            className="border border-gray-200 rounded-2xl p-4 mb-3"
          >
            <Text className="text-base font-bold">Shop ID: {String(item)}</Text>
            <Text className="text-gray-500 text-xs mt-1">Tap to select</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}