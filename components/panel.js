import styled from 'styled-components/native';

export const Panel = styled.View`
    flex: 1;
    width: 100%;
    borderRadius: 20px;
    padding: 20px;
    paddingTop: 10px;
    backgroundColor: ${({ theme }) => theme.colors.dark.secondary};
    alignItems: center;
    justifyContent: center;
    borderColor: ${({ theme }) => theme.colors.dark.border};
    borderBottomWidth: 5px;
    borderRightWidth: 5px;
    borderLeftWidth: 5px;
`;