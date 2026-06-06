# Backup: lógica de keyboard avoidance no SearchableSelectSheet

Removido em favor do `paddingBottom` no `actionSheetContentStyle` (calculado via `useSafeAreaInsets` em `insert.js`).

## Imports que foram removidos

```ts
import { FlatList, Keyboard, Platform, Animated, Dimensions, Easing } from "react-native";
//                                      ^^^^^^^           ^^^^^^
// Animated e Easing não são mais necessários
```

## State removido

```ts
const animatedMargin = useState(new Animated.Value(0))[0];
```

## useEffect removido (keyboard listeners)

```ts
useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
        const duration = Platform.OS === "ios" ? (e.duration ?? 250) : 120;
        Animated.timing(animatedMargin, {
            toValue: e.endCoordinates.height / 2,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start();
    });

    const onHide = Keyboard.addListener(hideEvent, () => {
        if (Platform.OS === "ios") {
            Animated.timing(animatedMargin, {
                toValue: 0,
                duration: 250,
                easing: Easing.in(Easing.ease),
                useNativeDriver: false,
            }).start();
        } else {
            animatedMargin.setValue(0);
        }
    });

    return () => {
        onShow.remove();
        onHide.remove();
    };
}, []);
```

## Linhas com `animatedMargin.setValue(0)` removidas

No `useEffect([isOpen])`:
```ts
animatedMargin.setValue(0);  // dentro do if (!isOpen)
```

No `handleClose`:
```ts
animatedMargin.setValue(0);
```

## JSX: Animated.View → View

Antes:
```tsx
<Animated.View style={{ width: "100%", paddingBottom: animatedMargin }}>
    ...
</Animated.View>
```

Depois:
```tsx
<View style={{ width: "100%" }}>
    ...
</View>
```
