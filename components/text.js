import styled from 'styled-components/native';
import { RFPercentage } from "react-native-responsive-fontsize";
import { useTheme } from '@rneui/themed';

const TitleWrapper = styled.Text`
    fontSize: ${RFPercentage(2)}px;
    fontFamily: "Roboto_400Regular";
    color: ${({ theme }) => theme.colors.flutu};
    alignSelf: ${(props) => props.align ? props.align : "flex-start"};
`;

export const Title = ({ children, align, color, style }) =>  {
    const { theme } = useTheme();
    return <TitleWrapper align={align} color={color} theme={theme} style={style}>{children}</TitleWrapper>
};

const TextWrapper = styled.Text`
    color: ${({ theme, color }) => color ? color : theme.colors.text};
    textAlign: ${(props) => props.align ? props.align : "center"};
`;

export const Text = ({ children, align, color, width, style }) =>  {
    const { theme } = useTheme();
    return <TextWrapper align={align} color={color} theme={theme} width={width ?? "auto"} style={style}>{children}</TextWrapper>
};

const PanelTextWrapper = styled.Text`
    flexWrap: nowrap;
    fontSize: ${({ size }) => size ? size : RFPercentage(2.5)}px;
    fontFamily: "Roboto_400Regular";
    color: ${({ theme }) => theme.colors.text};
    backgroundColor: ${({ theme }) => theme.colors.surface};
    paddingRight: 15px;
    paddingLeft: 15px;
    borderTopLeftRadius: 10px;
    borderTopRightRadius: 10px;
    width: 100%;
    textAlign: ${({ align }) => align ? align : "right"};
`;

export const PanelText = ({ children, align, color, style }) =>  {
    const { theme } = useTheme();
    return <PanelTextWrapper align={align} color={color} theme={theme} style={style}>{children}</PanelTextWrapper>
};

const PanelSubTextWrapper = styled.Text`
    fontSize: ${RFPercentage(1.8)}px;
    fontFamily: "Roboto_700Bold";
    alignSelf: flex-end;
    color: ${({ theme }) => theme.colors.textSecondary};
    padding: 5px;
    paddingRight: 15px;
    paddingLeft: 15px;
    borderBottomLeftRadius: 10px;
    borderBottomRightRadius: 10px;
    backgroundColor: ${({ theme }) => theme.colors.surface};
    width: 100 %;
    textAlign: right;
`;

export const PanelSubText = ({ children, align, color, style }) =>  {
    const { theme } = useTheme();
    return <PanelSubTextWrapper align={align} color={color} theme={theme} style={style}>{children}</PanelSubTextWrapper>
};