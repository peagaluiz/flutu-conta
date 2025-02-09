import styled from 'styled-components/native';
import { useTheme } from '@rneui/themed';

const PanelWrapper = styled.View`
    flex: 1;
    width: 100%;
    border-radius: 20px;
    padding: ${({ nopadding }) => nopadding ? "5px" : "20px"};
    padding-top: ${({ nopadding }) => nopadding ? "5px" : "10px"};
    background-color: ${({ theme }) => theme.colors.accent};
    align-items: center;
    justify-content: center;
    border-color: ${({ theme }) => theme.colors.tertiary};
    border-bottom-width: 5px;
    border-right-width: 5px;
    border-left-width: 5px;
`;

export const Panel = ({ nopadding, children, style }) => {
    const { theme } = useTheme();
    return <PanelWrapper theme={theme} nopadding={nopadding} style={style}>{children}</PanelWrapper>;
};
