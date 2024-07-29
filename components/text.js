import styled from 'styled-components/native';
import { RFPercentage } from "react-native-responsive-fontsize";

export const Title = styled.Text`
    fontSize: ${RFPercentage(2)}px;
    fontFamily: '${({ theme }) => theme.fonts.museo}';
    color: ${({ theme }) => theme.colors.complementary};
    alignSelf: ${(props) => props.align ? props.align : "flex-start"};
`;
export const Text = styled.Text`
    color: ${({ theme, color }) => color ? color : theme.colors.dark.text};
    textAlign: ${(props) => props.align ? props.align : "center"};
`;
export const PanelText = styled.Text`
    flexWrap: nowrap;
    fontSize: ${({ theme }) => theme.size ? theme.size : RFPercentage(2.5)}px;
    fontFamily: '${({ theme }) => theme.bold ? theme.fonts.roboto700 : theme.fonts.roboto}';
    color: ${({ theme }) => theme.colors.dark.text};
    alignSelf: ${({ theme }) => theme.align ? theme.align : "flex-end"};
    backgroundColor: ${({ theme }) => theme.colors.dark.default};
    paddingRight: 15px;
    paddingLeft: 15px;
    borderTopLeftRadius: 10px;
    borderTopRightRadius: 10px;
    width: 100%;
    textAlign: right;
`;
export const PanelSubText = styled.Text`
    fontSize: ${RFPercentage(1.5)}px;
    fontFamily: '${({ theme }) => theme.fonts.roboto}';
    alignSelf: flex - end;
    color: ${({ theme }) => theme.colors.textSecondary};
    padding: 5px;
    paddingRight: 15px;
    paddingLeft: 15px;
    borderBottomLeftRadius: 10px;
    borderBottomRightRadius: 10px;
    backgroundColor: ${({ theme }) => theme.colors.dark.default};
    width: 100 %;
    textAlign: right;
`;